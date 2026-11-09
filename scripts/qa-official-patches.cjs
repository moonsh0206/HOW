// Actual official notes JSON is served by the production preview, never mocked.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');
const json=p=>JSON.parse(fs.readFileSync(p)),url='http://127.0.0.1:5198/HOW/',dir='docs/research/official-patches-complete/qa';fs.mkdirSync(dir,{recursive:true});
const details=json('tests/fixtures/patch-detail-heroes.json'),heroes=json('tests/fixtures/overfast-heroes.json'),maps=json('src/data/standardMaps.json'),identities=json('tests/fixtures/overfast-perk-identities.json');
const batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>json('public/data/snapshots/'+f)).filter(b=>b.schemaVersion===2);
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const results=[];
for(const width of [320,390,1440]){const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let patchRequests=0;
page.on('request',r=>{if(r.url()===url+'data/patches/notes.json')patchRequests++;});
await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
await context.route('https://overfast-api.tekrop.fr/**',async r=>{const u=new URL(r.request().url());let data;
 if(u.pathname==='/heroes')data=heroes;else if(details[u.pathname.split('/').at(-1)])data=details[u.pathname.split('/').at(-1)];
 else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));else if(u.pathname==='/heroes/stats'&&!u.searchParams.has('map')){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
 else if(u.pathname.startsWith('/heroes/')){const h=heroes.find(h=>h.key===u.pathname.split('/').at(-1)),p=identities.find(h=>h.key==='kiriko');data={...h,perks:{minor:p.minor.map(i=>({...i,description:''})),major:p.major.map(i=>({...i,description:''}))}};}
 await r.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{})});
});
await page.setViewportSize({width,height:1000});await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#current-patch-note a')?.href.endsWith('#patch-2026-11-05'));assert((await page.locator('#current-patch-note').textContent()).includes('2026.11.06'));await page.locator('#current-patch-note').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-main.png`});
for(const [key,expected,date]of [['ana','90 → 60','2026.11.03'],['genji','2 → 1.5초','2026.11.03'],['wrecking-ball','15%','2026.11.05']]){
 await page.evaluate(key=>location.hash='/heroes/'+key,key);await page.waitForFunction(({expected,date})=>document.querySelector('.hero-patch-panel')?.textContent.includes(expected)&&document.querySelector('.hero-patch-panel')?.textContent.includes(date),{expected,date});
 const order=await page.locator('.detail-summary-side').evaluate(e=>[...e.children].map(e=>e.className||e.id));assert(order[0].includes('hero-patch-panel'));assert(order[1].includes('counter-panel'));assert(order[2].includes('synergy-panel'));assert.equal(await page.locator('.hero-patch-panel a').first().getAttribute('rel'),'noopener noreferrer');
 await page.waitForFunction(()=>document.querySelectorAll('#detail-minor .perk-selection-bar,#detail-major .perk-selection-bar').length===4);
 const summary=await page.locator('.hero-patch-change p').allTextContents();assert(summary.every(s=>/[가-힣]/.test(s)&&!s.includes('??')));
 await page.locator('.hero-patch-panel').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-${key}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 results.push({width,key,expected,date,order,perkBars:4,overflow:0});
}
for(const key of ['dmon','doctrine','emre','cassidy','dva','junker-queen']){await page.evaluate(key=>location.hash='/heroes/'+key,key);await page.waitForFunction(()=>!!document.querySelector('.hero-patch-panel'));const panel=page.locator('.hero-patch-panel');await panel.scrollIntoViewIfNeeded();const disclosure=panel.locator('.hero-patch-more > summary').first();if(await disclosure.count()){await disclosure.focus();await page.keyboard.press('Enter');assert(await disclosure.evaluate(e=>e.parentElement.open));}await page.screenshot({path:dir+'/'+width+'-'+key+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);results.push({width,key,changes:await panel.locator('.hero-patch-change').count(),overflow:0});}await page.evaluate(()=>location.hash='/heroes/kiriko');await page.waitForFunction(()=>document.querySelector('#hero-detail-page h1')?.textContent==='키리코');assert.equal(await page.locator('.hero-patch-panel').count(),0);assert.equal(patchRequests,1);assert.deepEqual(errors,[]);await context.close();}
fs.writeFileSync(dir+'/results.json',JSON.stringify({source:'Unintercepted production notes.json and real perk JSON; OverFast captured details/statistics',results},null,2));console.log(JSON.stringify(results));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

