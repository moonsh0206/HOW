// Optional local-only visual QA. Uses stored real data; never calls the statistics provider.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const phase=process.argv[2]??'after';if(!['before','after'].includes(phase))throw new Error('Expected before/after');
const dir=path.join('docs/qa/mobile-ui',phase);fs.mkdirSync(dir,{recursive:true});
const heroes=JSON.parse(fs.readFileSync('tests/fixtures/overfast-heroes.json','utf8'));
const maps=JSON.parse(fs.readFileSync('src/data/standardMaps.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('public/data/snapshots/index.json','utf8'));
const batches=[...new Set(manifest.snapshots.map(e=>e.file))].map(file=>JSON.parse(fs.readFileSync('public/data/snapshots/'+file,'utf8'))).filter(r=>r.schemaVersion===2);
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{
  const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'});
  // Bound optional third-party font loading; it must not stall local layout QA.
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,async route=>{try{await route.fulfill({response:await route.fetch({timeout:5000})});}catch{await route.abort();}});
  await context.route('https://overfast-api.tekrop.fr/**',async route=>{
   const u=new URL(route.request().url());let data;
   if(u.pathname==='/heroes')data=heroes;
   else if(u.pathname==='/heroes/genji')data=JSON.parse(fs.readFileSync('tests/fixtures/overfast-genji.json','utf8'));
   else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));
   else if(u.pathname==='/heroes/stats'){
    const batch=batches.find(b=>b.region===(u.searchParams.get('region')??'asia'));
    const division=batch?.divisions[u.searchParams.get('competitive_division')??'all'];
    if(division?.status==='ok'&&!u.searchParams.has('map'))data=batch.heroes.map((hero,i)=>({hero,winrate:division.records[i][0],pickrate:division.records[i][1],banrate:division.records[i][2]}));
   }
   await route.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{error:'No stored fixture for this condition'})});
  });
  let page;const errors=[];
  for(const width of phase==='before'?[390,1440]:[320,360,375,390,430,600,601,768,1024,1440]){
   if(page)await page.close();page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5197/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#stats-status')?.dataset.state==='ready'&&document.querySelectorAll('#hero-cards .hero-card').length===54);
   await page.waitForFunction(()=>innerWidth>600||getComputedStyle(document.querySelector('.meta-insights .insight-details>summary')).display==='flex');
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,6000))]));
   const metrics=await page.evaluate(()=>{
    const bounds=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top+scrollY,height:r.height,width:r.width,left:r.left,right:r.right};};
    return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,insightCards:document.querySelectorAll('.meta-insights .insight-panel').length,banner:bounds('.hero-banner'),insights:bounds('.meta-insights'),patch:bounds('#current-patch-note'),toolbar:bounds('#heroes .toolbar'),firstHero:bounds('#hero-cards .hero-card'),favorite:bounds('#hero-cards .favorite-button'),panelHeights:[...document.querySelectorAll('.meta-insights .insight-panel')].map(e=>e.getBoundingClientRect().height),patchParent:document.querySelector('#current-patch-note').parentElement.id||document.querySelector('#current-patch-note').parentElement.className};
   });
   assert.equal(metrics.overflow,0,`horizontal overflow at ${width}`);assert.equal(metrics.insightCards,5);assert.equal(metrics.patchParent,width<=600&&phase==='after'?'heroes':'sidebar');
   if(width<=600&&phase==='after'){
    assert.equal(metrics.favorite.width,44);assert.equal(metrics.favorite.height,44);
    const touch=await page.locator('.meta-insights summary').evaluateAll(elements=>elements.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
    if(touch.some(r=>!r.width))console.log('Hidden target diagnostic',await page.evaluate(()=>({url:location.href,listHidden:document.querySelector('#list-page').hidden,root:document.querySelector('.meta-insights').outerHTML.slice(0,700)})));
    assert(touch.every(r=>r.width>=43.9&&r.height>=43.9),`summary targets at ${width}: ${JSON.stringify(touch)}`);
   }
   await page.screenshot({path:path.join(dir,`${width}-top.png`)});
   await page.locator('#heroes .toolbar').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`${width}-roster.png`)});
   results.push(metrics);
   if(phase==='after'&&[320,390].includes(width)){
    for(const summary of await page.locator('.meta-insights .insight-details>summary').all())await summary.press('Enter');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);await page.locator('.meta-insights').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`${width}-expanded.png`)});
   }
  }
  if(phase==='after'){
   await page.setViewportSize({width:390,height:1000});
   const toggled=page.locator('#current-patch-note details');await toggled.evaluate(e=>e.open=false);
   const summary=page.locator('#current-patch-note summary');await summary.focus();await summary.press('Enter');assert(await toggled.evaluate(e=>e.open));
   await page.setViewportSize({width:768,height:1000});await page.waitForFunction(()=>document.querySelector('#current-patch-note').closest('.sidebar'));
   const desktop=await page.evaluate(()=>({open:document.querySelector('#current-patch-note details').open,focus:document.activeElement===document.querySelector('#current-patch-note summary'),count:document.querySelectorAll('#current-patch-note').length}));
   await page.setViewportSize({width:390,height:1000});await page.waitForFunction(()=>document.querySelector('#current-patch-note').parentElement.id==='heroes');
   const mobile=await page.evaluate(()=>({open:document.querySelector('#current-patch-note details').open,focus:document.activeElement===document.querySelector('#current-patch-note summary'),count:document.querySelectorAll('#current-patch-note').length}));
   results.push({patchResize:{desktop,mobile}});
   for(const state of [desktop,mobile]){assert(state.open);assert(state.focus);assert.equal(state.count,1);}
   for(const [id,name]of [['stats-division','rank'],['stats-map','map']]){
    await page.locator(`#${id}-trigger`).click();
    assert(await page.locator(`#${id}-listbox`).evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,Math.min(innerHeight-1,r.top+20));return !!hit&&e.contains(hit);}));
    await page.screenshot({path:path.join(dir,`390-${name}-open.png`)});await page.keyboard.press('Escape');
   }
   await page.locator('#hero-search').fill('겐지');await page.waitForFunction(()=>document.querySelectorAll('#hero-cards .hero-card').length===1);
   await page.locator('#hero-cards [data-favorite=genji]').click();assert.equal(await page.locator('#hero-cards [data-favorite=genji]').getAttribute('aria-pressed'),'true');
   await page.locator('#hero-cards [data-hero=genji]').click();await page.waitForFunction(()=>location.hash==='#/heroes/genji'&&document.querySelector('#hero-detail-page h1')?.textContent==='겐지');
   results.push({interactions:{search:true,favorite:true,heroDetail:true,patchKeyboard:true,dropdownsVisible:true}});
  }
  fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify({phase,statisticsSource:'Local saved grouped v2 files; external statistics requests intercepted',results,errors},null,2));
  assert.equal(errors.length,0);console.log(JSON.stringify({phase,widths:results.filter(r=>r.width).map(r=>r.width),overflows:results.filter(r=>r.width).map(r=>r.overflow),patchResize:results.find(r=>r.patchResize),errors}));await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
