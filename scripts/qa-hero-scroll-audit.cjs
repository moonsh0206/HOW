// Actual API roster/details collected by collect-hero-scroll-fixtures.js.
// No operating data writes, browser mocks contain only captured provider data.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('fs'),crypto=require('crypto');
const root='docs/qa/hero-scroll-audit',data=root+'/data',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const buildScripts=[...fs.readFileSync('dist/index.html','utf8').matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
const heroes=read(data+'/heroes.json'),collection=read(data+'/collection.json');
if(heroes.some(h=>!/^[-a-z0-9]+$/.test(h.key)||!collection.results.some(r=>r.heroKey===h.key&&r.status===200)))throw Error('Actual roster/detail coverage incomplete');
const details=Object.fromEntries(heroes.map(h=>[h.key,read(data+'/'+h.key+'.json')]));
const maps=read('src/data/standardMaps.json'),manifest=read('public/data/snapshots/index.json');
const batches=[...new Set(manifest.snapshots.map(s=>s.file))].map(f=>read('public/data/snapshots/'+f)).filter(b=>b.schemaVersion===2);
const bannerAssets=new Set(),imageAssets=new Set();
for(const h of heroes){const d=details[h.key],b=d.backgrounds?.find(b=>b.sizes.includes('xl+'))??d.backgrounds?.[0];if(b?.url){bannerAssets.add(b.url);imageAssets.add(b.url);}if(d.portrait)imageAssets.add(d.portrait);}
fs.mkdirSync(root+'/screenshots',{recursive:true});fs.mkdirSync(root+'/assets',{recursive:true});
const assetTasks=new Map(),assetResults=[];
async function actualImage(url){
 if(!assetTasks.has(url))assetTasks.set(url,(async()=>{
  const key=crypto.createHash('sha256').update(url).digest('hex'),file=root+'/assets/'+key;
  if(fs.existsSync(file)&&fs.existsSync(file+'.json'))return{bytes:fs.readFileSync(file),...read(file+'.json')};
  const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Image HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer()),meta={url,status:response.status,contentType:response.headers.get('content-type')??'image/jpeg',sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  fs.writeFileSync(file,bytes);fs.writeFileSync(file+'.json',JSON.stringify(meta));assetResults.push(meta);return{bytes,...meta};
 })());return assetTasks.get(url);
}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',reducedMotion:'reduce'}),page=await context.newPage();let pending=0;
  await page.addInitScript(()=>{window.__scrollCalls=[];const original=window.scrollTo.bind(window);window.scrollTo=(...args)=>{window.__scrollCalls.push({args,hash:location.hash,time:performance.now()});return original(...args);};});
  await context.route('https://**/*',async route=>{
   const url=route.request().url(),u=new URL(url);pending++;
   try{if(u.hostname==='overfast-api.tekrop.fr'){
     let value;if(u.pathname==='/heroes')value=heroes;
     else if(u.pathname==='/maps')value=maps.map(m=>({...m,uses:['standard']}));
     else if(details[u.pathname.split('/').at(-1)])value=details[u.pathname.split('/').at(-1)];
     else if(u.pathname==='/heroes/stats'){
      const b=batches.find(b=>b.region===(u.searchParams.get('region')??'asia')),d=b?.divisions[u.searchParams.get('competitive_division')??'all'];
      if(d?.status==='ok')value=b.heroes.map((hero,i)=>({hero,winrate:d.records[i][0],pickrate:d.records[i][1],banrate:d.records[i][2]}));
     }
     await route.fulfill({status:value?200:503,contentType:'application/json',body:JSON.stringify(value??{})});
    }else if(imageAssets.has(url)){const image=await actualImage(url);await route.fulfill({status:200,contentType:image.contentType,body:image.bytes});}
    else await route.abort();
   }catch(error){assetResults.push({url,error:error.message});await route.abort().catch(()=>{});}finally{pending--;}
  });
  await page.goto('http://127.0.0.1:5198/HOW/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#table-wrap')?.hidden===false&&['ready','stale','error','empty'].includes(document.querySelector('#stats-status')?.dataset.state));
  for(const hero of heroes)for(const tab of ['overview','abilities','perks']){
   const route='#/heroes/'+hero.key+'/'+tab;let result={heroKey:hero.key,viewport:width,route,pass:false};
   try{
    await page.evaluate(()=>location.hash='/tiers');await page.waitForFunction(()=>!document.querySelector('#list-page').hidden);await page.evaluate(()=>scrollTo(0,Math.min(1600,document.documentElement.scrollHeight-innerHeight)));
    await page.evaluate(hash=>{window.__scrollCalls=[];location.hash=hash;},route);
    await page.waitForFunction(()=>!document.querySelector('#hero-detail-page').hidden);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));result.initialScrollY=await page.evaluate(()=>scrollY);
    await page.waitForFunction(({name,tab})=>document.querySelector('#hero-detail-page h1')?.textContent===name&&document.querySelector('[data-detail-tab='+tab+']')?.hasAttribute('aria-current'),{name:hero.name,tab});
    const started=Date.now();while(pending&&Date.now()-started<15000)await new Promise(r=>setTimeout(r,25));
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    Object.assign(result,await page.evaluate(()=>{const banner=document.querySelector('.detail-hero'),r=banner.getBoundingClientRect(),header=document.querySelector('.site-header'),b=header.getBoundingClientRect(),position=getComputedStyle(header).position,img=banner.querySelector('.detail-background img');return{settledScrollY:scrollY,bannerTop:r.top,bannerBottom:r.bottom,visibleHeight:Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top)),headerPosition:position,coveredByHeader:['fixed','sticky'].includes(position)&&r.top<b.bottom,background:img?{url:img.currentSrc,loaded:img.naturalWidth>0}:null,overflow:document.documentElement.scrollWidth-innerWidth,scrollCalls:window.__scrollCalls};}));
    result.pass=Math.abs(result.initialScrollY)<=1&&Math.abs(result.settledScrollY)<=1&&result.bannerTop>=0&&result.bannerBottom<=900&&!result.coveredByHeader&&result.overflow<=0&&(!result.background||result.background.loaded);
    if(tab==='overview'||hero.key==='genji'||!result.pass){result.screenshot=`${root}/screenshots/${width}-${hero.key}-${tab}.png`;await page.screenshot({path:result.screenshot});}
   }catch(error){result.error=error.message;result.pass=false;}
   results.push(result);fs.writeFileSync(root+'/all-heroes.json',JSON.stringify({recordedAt:new Date().toISOString(),buildScripts,heroes:heroes.length,expected:heroes.length*3*2,checked:results.length,complete:results.length===heroes.length*3*2,results},null,2));
  }
  console.log({viewport:width,checked:results.filter(r=>r.viewport===width).length,failed:results.filter(r=>r.viewport===width&&!r.pass).length});await context.close();
 }
 }finally{await browser.close();fs.writeFileSync(root+'/asset-results.json',JSON.stringify(assetResults,null,2));}
 const failed=results.filter(r=>!r.pass);console.log({heroes:heroes.length,checked:results.length,failed:failed.map(r=>({hero:r.heroKey,viewport:r.viewport,route:r.route,y:r.settledScrollY,error:r.error}))});if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
