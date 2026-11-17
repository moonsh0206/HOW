const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
(async()=>{
 const {collectDailyRanks}=await import('../scripts/lib/dailyRanks.js');const {rankDay}=await import('../src/models/dailyRankModel.js');
 const roles=['tank','damage','support'],heroes=roles.flatMap(role=>[0,1,2].map(i=>({key:role+'-'+i,name:role+'-'+i,role})));
 const day=rankDay(new Date().toISOString()),today=day+'T01:00:00.000Z',yesterday=new Date(Date.parse(today)-86400000).toISOString();
 const records=reverse=>heroes.map(h=>{let n=Number(h.key.at(-1));if(reverse)n=2-n;return {hero:h.key,winRate:60-n*5,pickRate:20-n*5,banRate:10-n*3};});
 const service=(time,reverse)=>({getStatistics:async filters=>({filters,fetchedAt:time,providerAgeSeconds:12,records:records(reverse)})});
 const first=await collectDailyRanks({service:service(yesterday,true),heroes,previous:{schemaVersion:1,cohorts:[]},now:()=>Date.parse(yesterday)});
 const second=await collectDailyRanks({service:service(today,false),heroes,previous:first.archive,now:()=>Date.parse(today)});
 const output='docs/qa/rank-repair/render';fs.mkdirSync(output,{recursive:true});
 const root=path.resolve('dist'),base='http://127.0.0.1:5208/HOW/';let served=second.archive;
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,base).pathname;if(pathname==='/HOW/data/ranks/current.json'){res.setHeader('content-type','application/json');res.end(JSON.stringify(served));return;}let file=path.resolve(root,pathname.replace(/^\/HOW\//,''));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(5208,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),results=[];
 try{for(const width of [320,390,768,1024,1280,1440])for(const lang of ['ko','en','ja']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async r=>{const url=new URL(r.request().url());if(url.hostname!=='overfast-api.tekrop.fr')return r.abort();let data;if(url.pathname==='/heroes')data=heroes;else if(url.pathname==='/maps')data=[];else if(url.pathname==='/heroes/stats')data=records(true).map(row=>({hero:row.hero,winrate:row.winRate,pickrate:row.pickRate,banrate:row.banRate}));return data?r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}):r.abort();});
  await page.goto(base+lang+'/tiers');await page.waitForSelector('#hero-rows tr',{state:'attached'});assert.equal(await page.locator('.rank-change').count(),0);
  await page.locator('[data-role=damage]').click();await page.waitForFunction(()=>document.querySelector('#hero-rows')?.dataset.rankStatus==='ready-stored-order');
  const ordinal=page.locator((width<=600?'#hero-cards':'#hero-rows')+' [data-ordinal="3"] .rank-change');assert.equal(await ordinal.textContent(),'▲2');assert.match(await ordinal.getAttribute('title'),/3.*1/);assert.match(await ordinal.getAttribute('title'),/KST/);assert.equal(await page.locator('#rank-comparison-note').isVisible(),true);
  await page.locator('#rank-comparison-note').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${width}-${lang}-stored-vs-live.png`,fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow)console.log({width,lang,overflow,offenders:await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+.5).map(e=>({id:e.id,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,8))});
  assert.equal(overflow,0);
  if(width===390&&lang==='ko'){
   for(const code of ['en','ja','ko']){await page.locator('.header-language [role=combobox]').click();await page.locator('.header-language [role=option][data-value='+code+']').click();await page.waitForFunction(value=>document.documentElement.lang===value,code);await page.waitForFunction(()=>document.querySelector('#hero-rows')?.dataset.rankStatus==='ready-stored-order');assert.equal(await ordinal.textContent(),'\u25b22');assert.equal(await page.locator('#rank-comparison-note').isVisible(),true);}
   for(const [id,value]of [['stats-region','europe'],['stats-division','master_plus'],['stats-region','asia'],['stats-division','diamond_plus']]){await page.locator('#'+id).selectOption(value,{force:true});await page.waitForFunction(()=>document.querySelector('#hero-rows')?.dataset.rankStatus==='ready-stored-order');assert.equal(await ordinal.textContent(),'\u25b22');}
  }
  await page.locator('#hero-search').fill('damage-0');assert.equal(await ordinal.textContent(),'▲2');
  await page.locator('#sort').selectOption('winrate-desc',{force:true});assert.equal(await page.locator('.rank-change').count(),0);await page.locator('#sort').selectOption('tier-desc',{force:true});assert.equal(await ordinal.textContent(),'▲2');
  await page.locator('#hero-search').fill('');await page.locator('[data-role=all]').click();assert.equal(await page.locator('.rank-change').count(),0);assert.equal(await page.locator('#rank-comparison-note').isVisible(),false);
  assert.deepEqual(errors,[]);results.push({width,lang,pass:true,overflow,errors});await context.close();
 }
 // A normal build/redeployment reading the same published rank JSON retains comparison.
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'data/ranks/current.json');assert.equal((await page.locator('body').textContent()).includes('deltas'),true);await context.close();
 fs.writeFileSync(output+'/results.json',JSON.stringify({fixtureOnly:true,originalRequests:first.requests+second.requests,cohorts:second.archive.cohorts.length,results},null,2));console.log({passed:results.length});}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
