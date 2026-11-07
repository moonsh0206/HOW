// Local-only optional Playwright QA. No production API fallback or CORS bypass.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dir='docs/research/overlooker/qa';fs.mkdirSync(dir,{recursive:true});
const heroes=JSON.parse(fs.readFileSync('tests/fixtures/overfast-heroes.json'));
const genji=JSON.parse(fs.readFileSync('tests/fixtures/overfast-genji.json'));
const perks=JSON.parse(fs.readFileSync('tests/fixtures/overlooker-genji.json'));
const maps=JSON.parse(fs.readFileSync('src/data/standardMaps.json'));
const batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>JSON.parse(fs.readFileSync('public/data/snapshots/'+f))).filter(b=>b.schemaVersion===2);
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const results=[];
 for(const mode of ['captured-response','live-cors']){
  const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'});let perkRequests=0;
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
  await context.route('https://overfast-api.tekrop.fr/**',async r=>{const u=new URL(r.request().url());let data;
   if(u.pathname==='/heroes')data=heroes;else if(u.pathname==='/heroes/genji')data=genji;else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));
   else if(u.pathname==='/heroes/stats'){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
   await r.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{})});
  });
  if(mode==='captured-response')await context.route('https://stats.overlooker.app/api/perks/**',async r=>{perkRequests++;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(perks)});});
  for(const width of mode==='captured-response'?[320,375,390,430,1440]:[390]){
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5197/#/heroes/genji',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#hero-detail-page h1')?.textContent==='겐지');
   const before=perkRequests;await page.locator('[data-detail-tab=perks]').click();
   if(mode==='captured-response'){
    await page.waitForFunction(()=>document.querySelectorAll('.perk-selection-bar').length===4);
    assert.equal(await page.locator('#detail-minor .perk-selection-heading strong').first().textContent(),'35.79%');
    await page.locator('[data-detail-tab=abilities]').click();await page.locator('[data-detail-tab=perks]').click();assert.equal(perkRequests,before+1);
    assert.equal(await page.locator('.perk-selection-bar').count(),4);assert.equal(await page.locator('#detail-perk-rates a').getAttribute('rel'),'noopener noreferrer');
   }else{
    await page.waitForFunction(()=>document.querySelector('#detail-perk-rates')?.textContent.includes('특전 통계를 불러오지 못했습니다'));
    assert.equal(await page.locator('.perk-selection-bar').count(),0);assert.equal(await page.locator('#detail-minor .ability-card').count(),2);
    await page.locator('#detail-perk-rates summary').click();assert((await page.locator('#detail-perk-rates').textContent()).includes('CORS'));
   }
   await page.locator('#detail-minor').scrollIntoViewIfNeeded();
   await page.locator('#detail-minor img,#detail-major img').evaluateAll(imgs=>Promise.race([Promise.all(imgs.map(img=>img.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]));
   await page.screenshot({path:`${dir}/${mode}-${width}.png`});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.equal(overflow,0);assert.deepEqual(errors,[]);
   results.push({mode,width,overflow,percentages:mode==='captured-response',sourceVisible:await page.locator('#detail-perk-rates a').isVisible(),jsErrors:errors});await page.close();
  }
  await context.close();
 }
 fs.writeFileSync(`${dir}/results.json`,JSON.stringify({capturedResponse:'Actual API capture from tests/fixtures, injected only in QA; not live production success',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
