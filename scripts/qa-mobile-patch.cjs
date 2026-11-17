const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),phase=process.argv[2]??'after',liveImages=process.argv.includes('--images'),out='docs/qa/mobile-patch/'+phase;fs.mkdirSync(out,{recursive:true});
(async()=>{const root=path.resolve('dist'),base='http://127.0.0.1:5210/HOW/',batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>read('public/data/snapshots/'+f)).filter(b=>b.schemaVersion===2);
 const server=http.createServer((req,res)=>{let file=path.resolve(root,new URL(req.url,base).pathname.replace(/^\/HOW\//,''));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(5210,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),results=[];
 try{for(const width of [320,390,430,1280,1440])for(const lang of (liveImages?['ko']:['ko','en','ja'])){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='overfast-api.tekrop.fr'){if(liveImages&&r.request().resourceType()==='image'&&/cloudfront\.net|akamaized\.net|blizzard\.com/.test(u.hostname))return r.continue();return r.abort();}requests.push(u.pathname+u.search);let data;const locale=u.searchParams.get('locale')??'ko-kr',key=u.pathname.split('/').at(-1),map=u.searchParams.get('map')??'all';
   if(u.pathname==='/heroes')data=read(locale==='ja-jp'?'docs/qa/japanese/heroes-ja.json':locale==='en-us'?'docs/qa/phase5/heroes-en.json':'tests/fixtures/overfast-heroes.json');
   else if(u.pathname==='/maps')data=read('src/data/standardMaps.json').map(m=>({...m,uses:['standard']}));
   else if(u.pathname==='/heroes/stats'){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>hero==='genji'?{hero,winrate:map==='all'?52.123456:map==='busan'?52.456789:53.654321,pickrate:map==='all'?8.567891:8.123456,banrate:map==='all'?.001234:.000456}:{hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]});}
   else if(u.pathname.startsWith('/heroes/')){const file=locale==='ja-jp'?`docs/qa/japanese/details/${key}.json`:locale==='en-us'&&key==='genji'?'docs/qa/phase5/genji-en.json':`docs/qa/hero-scroll-audit/data/${key}.json`;if(fs.existsSync(file))data=read(file);}
   return data?r.fulfill({status:200,contentType:'application/json',headers:{age:'30'},body:JSON.stringify(data)}):r.abort();});
  await page.goto(base+lang+'/heroes/genji/overview',{waitUntil:'networkidle'});await page.waitForSelector('#pick-history');

  const measure=()=>page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{y:r.top+scrollY,height:r.height,bottom:r.bottom+scrollY}:null;};return {patch:rect('.hero-patch-panel'),graph:rect('#pick-history'),overflow:document.documentElement.scrollWidth-innerWidth};});
  const collapsed=await measure();await page.screenshot({path:out+'/'+width+'-'+lang+'-collapsed.png',fullPage:true});const button=page.locator('.hero-patch-toggle');
  if(phase==='after'){
   assert.equal(await page.locator('.hero-patch-panel').getAttribute('data-change-count'),'2');
   if(width<=600){assert.equal(await button.getAttribute('aria-expanded'),'false');assert(await page.locator('.hero-patch-body').evaluate(e=>e.hidden));await button.click();await page.waitForTimeout(300);assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.hero-patch-body').evaluate(e=>e.hidden),false);}
   else {assert.equal(await button.isVisible(),false);assert.equal(await page.locator('.hero-patch-body').evaluate(e=>e.hidden),false);}
  }
  const expanded=await measure();await page.screenshot({path:out+'/'+width+'-'+lang+'-expanded.png',fullPage:true});
  if(phase==='after'&&width<=600){await page.locator('[data-history-metric=winRate]').click();assert.equal(await page.locator('.hero-patch-toggle').getAttribute('aria-expanded'),'true');const internal=page.locator('.hero-patch-mode');await internal.locator('summary').first().click();await page.locator('[data-history-metric=banRate]').click();assert.equal(await internal.evaluate(e=>e.open),true);await page.locator('.hero-patch-toggle').click();await page.waitForTimeout(300);assert.equal(await page.locator('.hero-patch-body').evaluate(e=>e.hidden),true);await page.locator('[data-history-metric=pickRate]').click();assert.equal(await page.locator('.hero-patch-toggle').getAttribute('aria-expanded'),'false');}
  assert.equal(collapsed.overflow,0);assert.equal(expanded.overflow,0);assert.deepEqual(errors,[]);results.push({width,lang,collapsed,expanded,errors});await context.close();
 }fs.writeFileSync(out+'/results.json',JSON.stringify({phase,fixtureOnly:true,results},null,2));console.log({phase,passed:results.length});}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
