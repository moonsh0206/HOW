// Historical graph JSON is real archived/live data. Current API responses are
// captured fixtures; this browser rehearsal performs no additional API requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const json=p=>JSON.parse(fs.readFileSync(p)),out='docs/qa/graph-automation';
(async()=>{
 const live=json(out+'/live.json'),root=path.join(live.temporaryArchive,'dist'),oldIndex=fs.readFileSync('public/data/snapshots/index.json');
 const originals=fs.readdirSync('public/data/snapshots').filter(n=>n!=='index.json').map(n=>json('public/data/snapshots/'+n)).filter(b=>b.schemaVersion===2);
 const server=http.createServer((req,res)=>{let file=path.resolve(root,new URL(req.url,'http://localhost').pathname.replace(/^\/HOW\//,''));if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}try{if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(5203,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
 try{for(const width of [1440,390,320])for(const lang of ['ko','en']){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let stale=true,indexRequests=0;page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/data/snapshots/index.json',r=>{indexRequests++;return r.fulfill({status:200,contentType:'application/json',body:stale?oldIndex:fs.readFileSync(path.join(root,'data/snapshots/index.json'))});});
  await context.route('https://**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='overfast-api.tekrop.fr')return r.abort();let data;
   if(u.pathname==='/heroes')data=json(lang==='en'?'docs/qa/phase5/heroes-en.json':'tests/fixtures/overfast-heroes.json');
   else if(u.pathname==='/maps')data=json('src/data/standardMaps.json').map(m=>({...m,uses:['standard']}));
   else if(u.pathname==='/heroes/stats'){const b=originals.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d)data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
   else if(u.pathname.startsWith('/heroes/')){const key=u.pathname.split('/').at(-1),file='docs/qa/hero-scroll-audit/data/'+key+'.json';if(fs.existsSync(file))data=json(file);}
   return data?r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}):r.abort();
  });
  const open=async hero=>{await page.evaluate(({hero,lang})=>{history.pushState(null,'',`/HOW/${lang}/heroes/${hero}/overview`);dispatchEvent(new PopStateEvent('popstate'));},{hero,lang});await page.waitForSelector('#pick-history .history-point[data-storage=stored]');};
  await page.goto(`http://127.0.0.1:5203/HOW/${lang}/heroes/ana/overview`);await page.waitForSelector('#pick-history .history-point[data-storage=stored]');
  const points=()=>page.locator('#pick-history .history-point[data-storage=stored]').allTextContents();const before=await points();stale=false;
  await open('genji');await open('ana');await page.waitForFunction(n=>document.querySelectorAll('#pick-history .history-point[data-storage=stored]').length>n,before.length);
  const metrics={};for(const metric of ['winRate','pickRate','banRate']){await page.locator(`[data-history-metric=${metric}]`).click();assert.equal(await page.locator(`[data-history-metric=${metric}]`).getAttribute('aria-pressed'),'true');metrics[metric]=await points();assert(metrics[metric].some(s=>s.includes('11. 16.')||s.includes('11/16/2026')),'New actual observation timestamp displayed');}
  assert(indexRequests>=3,'Hero navigation refreshes manifest without waiting ten minutes');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);assert.deepEqual(errors,[]);
  await page.locator('#pick-history').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-${lang}.png`});
  // Custom combobox owns presentation; change its backing native select here.
  const choose=async(id,value)=>{const count=indexRequests;await page.locator('#'+id).selectOption(value,{force:true});await page.waitForFunction(()=>document.querySelector('#pick-history')?.getAttribute('aria-busy')!=='true');await page.waitForTimeout(150);assert(indexRequests>count);};
  await choose('stats-division','diamond');assert.equal((await points()).length,3,'Asia original diamond: two old and one new actual observation');
  await choose('stats-region','europe');assert.equal((await points()).length,1,'Europe must not borrow new Asia point');assert(await page.locator('.history-availability').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);assert.deepEqual(errors,[]);
  results.push({width,lang,beforeStored:before.length,afterStored:metrics.pickRate.length,indexRequests,metrics,regionIsolation:true,originalAndComposite:true,insufficientHint:true,overflow:0});await context.close();
 }fs.writeFileSync(out+'/browser.json',JSON.stringify({source:'real old/new graph observations; captured current API fixtures',results},null,2));console.log({checked:results.length});}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
