// Optional Playwright QA using preserved local statistics; no provider collection.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dir='docs/research/meta-v21/qa';fs.mkdirSync(dir,{recursive:true});
const heroes=JSON.parse(fs.readFileSync('tests/fixtures/overfast-heroes.json','utf8'));
const maps=JSON.parse(fs.readFileSync('src/data/standardMaps.json','utf8'));
const batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>JSON.parse(fs.readFileSync(`public/data/snapshots/${f}`,'utf8'))).filter(b=>b.schemaVersion===2);
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'}),results=[],errors=[];
await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
await context.route('https://overfast-api.tekrop.fr/**',async route=>{
 const u=new URL(route.request().url());let data;
 if(u.pathname==='/heroes')data=heroes;
 else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));
 else if(u.pathname==='/heroes/stats'){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia'));const d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
 else if(u.pathname.startsWith('/heroes/'))data=heroes.find(h=>h.key===u.pathname.split('/').at(-1));
 await route.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{})});
});
for(const width of [320,375,390,430,1440]){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5197/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#stats-status')?.dataset.state==='ready'&&document.querySelectorAll('#hero-cards .hero-card').length===54);
 const result=await page.evaluate(()=>{const ids=root=>[...document.querySelectorAll(`${root} [data-tier]`)].map(e=>({key:e.dataset.tier,text:e.textContent}));return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,cards:ids('#hero-cards'),table:ids('#hero-rows')};});
 // Table tbody ID can vary; use its semantic table instead.
 const table=await page.locator('table [data-tier]').evaluateAll(es=>es.map(e=>({key:e.dataset.tier,text:e.textContent})));assert.deepEqual(result.cards,table);assert.equal(result.overflow,0);assert(result.cards.find(h=>h.key==='junkrat').text.includes('조건부'));assert(result.cards.findIndex(h=>h.key==='shion')<result.cards.findIndex(h=>h.key==='junkrat'));
 const root=width<=600?'#hero-cards':'table';await page.locator(`${root} [data-tier=junkrat]`).scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-list.png`});
 const tier=page.locator(`${root} [data-tier=junkrat]`);await tier.focus();await tier.press('Enter');await page.waitForFunction(()=>document.querySelector('#tier-tooltip')?.textContent.includes('조건부 A'));await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:5197/#/heroes/junkrat',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#hero-detail-page .recommendation-description')?.textContent.includes('조건부 A'));
 await page.locator('#detail-page-statistics').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-detail.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 results.push({width,overflow:0,identicalTableCards:true,shionBeforeJunkrat:true,keyboardTierHelp:true,detailDescription:true});await page.close();}
assert.equal(errors.length,0);fs.writeFileSync(`${dir}/results.json`,JSON.stringify({source:'Existing saved November 6 grouped statistics; API intercepted, metadata-only detail fixture',results,errors},null,2));console.log(JSON.stringify(results));
await context.close();}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
