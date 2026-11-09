// Actual official notes JSON is served by the production preview, never mocked.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');
const json=p=>JSON.parse(fs.readFileSync(p)),url='http://127.0.0.1:5198/HOW/',phase=process.argv[2]??'after',dir='docs/qa/detail-tabs/'+phase;fs.mkdirSync(dir,{recursive:true});
const details={...json('tests/fixtures/patch-detail-heroes.json'),reaper:json('docs/qa/responsive-unified/reaper-detail.json')},heroes=json('tests/fixtures/overfast-heroes.json'),maps=json('src/data/standardMaps.json'),identities=json('tests/fixtures/overfast-perk-identities.json');
const batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>json('public/data/snapshots/'+f)).filter(b=>b.schemaVersion===2);
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const results=[];
for(const width of ([320,360,375,390,430,1024,1280,1440])){const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let patchRequests=0;
page.on('request',r=>{if(r.url()===url+'data/patches/notes.json')patchRequests++;});
for(const asset of json('docs/qa/responsive-unified/background-check.json').filter(a=>a.status===200))await context.route(asset.url,r=>r.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(asset.file)}));
await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
await context.route('https://overfast-api.tekrop.fr/**',async r=>{const u=new URL(r.request().url());let data;
 if(u.pathname==='/heroes')data=heroes;else if(details[u.pathname.split('/').at(-1)])data=details[u.pathname.split('/').at(-1)];
 else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));else if(u.pathname==='/heroes/stats'&&!u.searchParams.has('map')){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
 else if(u.pathname.startsWith('/heroes/')){const h=heroes.find(h=>h.key===u.pathname.split('/').at(-1)),p=identities.find(h=>h.key==='kiriko');data={...h,perks:{minor:p.minor.map(i=>({...i,description:''})),major:p.major.map(i=>({...i,description:''}))}};}
 await r.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{})});
});
await page.setViewportSize({width,height:1000});await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!document.querySelector('#current-patch-note a'));
for(const key of ['genji','ana','reaper','dmon','kiriko']){
 await page.evaluate(key=>location.hash='/heroes/'+key,key);await page.waitForFunction(name=>document.querySelector('#hero-detail-page h1')?.textContent===name,heroes.find(h=>h.key===key).name);await page.waitForFunction(()=>!!document.querySelector('.detail-metrics'));
 assert(await page.locator('.detail-tabs').evaluate(e=>e.previousElementSibling.classList.contains('detail-hero')));assert(await page.locator('#detail-overview').isVisible());assert(!await page.locator('#detail-abilities').isVisible());assert(!await page.locator('#detail-minor').isVisible());
 const layout=await page.locator('.detail-overview-grid').evaluate(e=>Object.fromEntries([...e.children].map(c=>{const r=c.getBoundingClientRect();return[c.classList.contains('detail-metrics')?'metrics':c.classList.contains('hero-patch-panel')?'patch':c.classList.contains('detail-summary-main')?'main':c.classList.contains('counter-panel')?'counter':c.classList.contains('synergy-panel')?'synergy':'passive',{x:r.x,y:r.y,w:r.width,h:r.height}]})));
 if(width<=600){let previous=-Infinity;for(const name of ['metrics','patch','main','counter','synergy','passive'])if(layout[name]){assert(layout[name].y>=previous);previous=layout[name].y;}}else{assert(layout.counter.x>layout.main.x);assert(layout.metrics.w>layout.main.w);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:dir+'/'+width+'-'+key+'.png'});
 for(const metric of ['winRate','banRate','pickRate']){await page.locator('[data-history-metric='+metric+']').click();assert.equal(await page.locator('[data-history-metric='+metric+']').getAttribute('aria-pressed'),'true');}
 await page.locator('[data-detail-tab=abilities]').click();await page.waitForFunction(()=>!document.querySelector('#detail-abilities').hidden);assert(!await page.locator('#detail-overview').isVisible());assert.equal(await page.locator('#detail-passives').count(),1);assert(await page.locator('#detail-abilities #detail-passives').isVisible());
 await page.locator('[data-detail-tab=perks]').click();await page.waitForFunction(()=>!document.querySelector('#detail-minor').hidden);assert(!await page.locator('#detail-overview').isVisible());assert(!await page.locator('#detail-abilities').isVisible());assert.equal(await page.locator('#detail-minor .ability-card:visible').count(),2);
 if(['genji','ana','reaper'].includes(key)){await page.waitForFunction(()=>document.querySelectorAll('#detail-minor .perk-selection-bar,#detail-major .perk-selection-bar').length===4);}
 if(key==='genji')await page.screenshot({path:dir+'/'+width+'-perks.png'});
 await page.goBack();await page.waitForFunction(()=>!document.querySelector('#detail-abilities').hidden);await page.locator('[data-detail-tab=overview]').click();await page.waitForFunction(()=>!document.querySelector('#detail-overview').hidden);assert.equal(await page.locator('#detail-passives').count(),1);assert(await page.locator('.detail-overview-grid>#detail-passives').isVisible());
 const favorite=page.locator('.detail-favorite');await favorite.click();await favorite.click();results.push({width,key,layout,overflow:0,tabs:true,back:true,metrics:true});
}
assert.equal(patchRequests,1);assert.deepEqual(errors,[]);await context.close();}
fs.writeFileSync(dir+'/results.json',JSON.stringify({source:'Production local JSON and captured actual OverFast data',results},null,2));console.log({checked:results.length,widths:[...new Set(results.map(r=>r.width))]});}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
