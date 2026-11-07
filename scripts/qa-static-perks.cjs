// Real locally collected JSON is served by Vite preview; it is never intercepted.
// Unrelated OverFast responses use existing captures, not fresh hero statistics.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const origin='http://127.0.0.1:5198',base='/HOW/',url=origin+base;
const dir='docs/research/perk-card-integration/qa';fs.mkdirSync(dir,{recursive:true});
const json=file=>JSON.parse(fs.readFileSync(file));
const archive=json('public/data/perks/overlooker-perks.json'),mapping=json('src/data/perkMappings.json');
const heroes=json('tests/fixtures/overfast-heroes.json'),genji=json('tests/fixtures/overfast-genji.json'),identities=json('tests/fixtures/overfast-perk-identities.json'),maps=json('src/data/standardMaps.json');
const batches=fs.readdirSync('public/data/snapshots').filter(f=>f!=='index.json').map(f=>json('public/data/snapshots/'+f)).filter(b=>b.schemaVersion===2);
function expected(key){return mapping.heroes[key].perks.map(p=>({name:p.nameKo,rate:(archive.heroes[key][p.tier].find(t=>t[0]===p.providerPerkId)[1]*100).toFixed(2)+'%'})).sort((a,b)=>a.name.localeCompare(b.name));}
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const results=[];
 for(const width of [320,375,390,430,1440]){
  const context=await browser.newContext({locale:'ko-KR',reducedMotion:'reduce'}),page=await context.newPage();let archiveRequests=0;const providerRequests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url()===url+'data/perks/overlooker-perks.json')archiveRequests++;if(r.url().startsWith('https://stats.overlooker.app'))providerRequests.push(r.url());});
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
  await context.route('https://overfast-api.tekrop.fr/**',async r=>{const u=new URL(r.request().url());let data;
   if(u.pathname==='/heroes')data=heroes;
   else if(u.pathname==='/heroes/genji')data=genji;
   else if(u.pathname.startsWith('/heroes/')&&u.pathname!=='/heroes/stats'){
    const key=u.pathname.split('/').at(-1),h=heroes.find(h=>h.key===key),identity=identities.find(h=>h.key===key);
    if(h&&identity)data={...h,perks:{minor:identity.minor.map(p=>({...p,description:''})),major:identity.major.map(p=>({...p,description:''}))}};
   }else if(u.pathname==='/maps')data=maps.map(m=>({...m,uses:['standard']}));
   else if(u.pathname==='/heroes/stats'&&!u.searchParams.has('map')){const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];if(d?.status==='ok')data=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));}
   await r.fulfill({status:data?200:503,contentType:'application/json',body:JSON.stringify(data??{})});
  });
  const readRates=()=>page.locator('#detail-minor .ability-card,#detail-major .ability-card').evaluateAll(es=>es.map(e=>({name:e.querySelector('h3').textContent,rate:e.querySelector('.perk-selection-heading strong')?.textContent})).sort((a,b)=>a.name.localeCompare(b.name)));
  const ready=async(key,tab='perks')=>{await page.waitForFunction(({key,tab})=>location.hash==='#/heroes/'+key+(tab==='overview'?'':'/'+tab)&&document.querySelectorAll('.perk-selection-bar').length===4,{key,tab});assert.deepEqual(await readRates(),expected(key));};
  await page.setViewportSize({width,height:1000});await page.goto(url+'#/heroes/genji',{waitUntil:'domcontentloaded'});await ready('genji','overview');assert.equal(archiveRequests,1);
  assert.equal(await page.locator('#detail-perk-rates').evaluate(e=>e.tagName),'FOOTER');assert.equal(await page.locator('#detail-perk-rates h2,#detail-perk-rates .ability-card').count(),0);
  assert.equal(await page.locator('.perk-selection-bar').evaluateAll(es=>es.filter(e=>e.closest('#detail-minor .ability-card,#detail-major .ability-card')).length),4);
  assert(!(await page.locator('#hero-detail-page').textContent()).includes('특전 탭에서'));
  await page.evaluate(()=>{window.__perkCardNodes=[...document.querySelectorAll('#detail-minor .ability-card,#detail-major .ability-card')];});
  const response=await context.request.get(url+'data/perks/overlooker-perks.json');assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/application\/json/);assert.deepEqual(await response.body(),fs.readFileSync('public/data/perks/overlooker-perks.json'));
  await page.locator('#detail-minor').scrollIntoViewIfNeeded();await page.locator('#detail-minor img,#detail-major img').evaluateAll(imgs=>Promise.race([Promise.all(imgs.map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]));await page.screenshot({path:`${dir}/${width}-overview-cards.png`});
  await page.locator('[data-detail-tab=perks]').click();await ready('genji');assert.equal(archiveRequests,1);
  assert(await page.evaluate(()=>window.__perkCardNodes.every((e,i)=>e===document.querySelectorAll('#detail-minor .ability-card,#detail-major .ability-card')[i])));
  await page.locator('#detail-minor').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-perks.png`});
  await page.locator('#detail-major').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-major.png`});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.equal(overflow,0);assert((await page.locator('#detail-perk-rates').textContent()).includes('HOW 수집'));assert.equal(await page.locator('#detail-perk-rates a').getAttribute('rel'),'noopener noreferrer');
  const interactions=[];
  if(width===390||width===1440){
   const choose=async(field,value)=>{await page.locator(`#stats-${field}-trigger`).click();await page.locator(`#stats-${field}-listbox [data-value="${value}"]`).click();await page.waitForFunction(({field,value})=>document.querySelector(`#stats-${field}`).value===value,{field,value});assert.deepEqual(await readRates(),expected('genji'));assert.equal(archiveRequests,1);interactions.push(field+':'+value);};
   for(const [field,value]of [['region','europe'],['division','gold'],['region','americas'],['division','master_plus'],['region','asia'],['division','diamond_plus'],['map','busan'],['map','all'],['mode','quickplay'],['mode','competitive'],['division','diamond_plus']])await choose(field,value);
   await page.locator('[data-detail-tab=abilities]').click();await page.locator('[data-detail-tab=perks]').click();await ready('genji');assert.equal(archiveRequests,1);interactions.push('tabs');
   await page.locator('.synergy-panel a[href="#/heroes/ana"]').click();await page.waitForFunction(()=>document.querySelector('#hero-detail-page h1')?.textContent==='아나');await page.locator('[data-detail-tab=perks]').click();await ready('ana');assert.equal(archiveRequests,1);interactions.push('hero:ana');
   await page.goBack();await page.goBack();await ready('genji');assert.equal(archiveRequests,1);interactions.push('back');
   await page.reload({waitUntil:'domcontentloaded'});await ready('genji');assert.equal(archiveRequests,2);interactions.push('reload');
   await page.locator('#detail-perk-rates').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${width}-source.png`});
  }
  assert.equal(providerRequests.length,0);assert.deepEqual(errors,[]);results.push({width,overflow,archiveRequests,externalPerkRequests:providerRequests.length,displayMatchesSavedJSON:true,interactions,jsErrors:errors});await context.close();
 }
 fs.writeFileSync(`${dir}/results.json`,JSON.stringify({origin:url,collectedAt:archive.collectedAt,sha256:crypto.createHash('sha256').update(fs.readFileSync('public/data/perks/overlooker-perks.json')).digest('hex'),dataSource:'Unintercepted same-origin production build JSON from real collector, no perk fixtures',unrelatedAPIs:'OverFast metadata/statistics fixtures; selected-map statistics return unavailable',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
