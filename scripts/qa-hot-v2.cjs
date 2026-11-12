const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const output='docs/qa/hot-v2';
(async()=>{
 const {expandSnapshotFile}=await import('../src/models/snapshotV2Model.js');
 const index=JSON.parse(fs.readFileSync('public/data/snapshots/index.json'));
 const entries=index.snapshots.filter(e=>e.filters.region==='asia'&&e.filters.division==='diamond').sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
 const frames=entries.map(e=>expandSnapshotFile(JSON.parse(fs.readFileSync('public/data/snapshots/'+e.file))).find(s=>s.filters.region==='asia'&&s.filters.division==='diamond'));
 const current=frames.at(-1),previous=frames.at(-2),roster=JSON.parse(fs.readFileSync('src/data/subroles.json')),names=JSON.parse(fs.readFileSync('tests/fixtures/overfast-heroes.json'));
 const englishNames=JSON.parse(fs.readFileSync('docs/qa/phase5/heroes-en.json'));
 const payload={current,previous,heroes:Object.entries(roster.heroes).map(([key,row])=>({key,name:names.find(h=>h.key===key)?.name??key,nameEn:englishNames.find(h=>h.key===key)?.name??key,role:row.parentRole}))};
 let html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('%BASE_URL%','/public/');
 html=html.replace('</head>',['main','detail','layout','filters','navigation','player','interactions'].map(name=>`<link rel="stylesheet" href="/src/styles/${name}.css">`).join('')+'</head>');
 html+=`<script type="module">
 import {createHeroModel} from '/src/models/heroModel.js';
 import {createInsightView} from '/src/views/insightView.js';
 import {setLanguage,t} from '/src/i18n/i18n.js';
 const data=${JSON.stringify(payload)},lang=new URL(location.href).searchParams.get('lang')??'ko';setLanguage(lang);document.documentElement.lang=lang;
 document.querySelector('#meta-page').hidden=false;
 const model=createHeroModel();Object.assign(model.state,{heroes:data.heroes.map(h=>({...h,name:lang==='en'?h.nameEn:h.name})),statsFilters:data.current.filters,statsStatus:'ready',snapshotStatus:'ready',statistics:{...data.current,fetchedAt:data.current.collectedAt},previousSnapshot:data.previous});
 const view=createInsightView();view.render(model);window.qa={model,view,t};
 </script>`;
 const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(relative==='/'){res.setHeader('content-type','text/html');res.end(html);return;}const file=path.resolve('.'+relative);if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'image/svg+xml');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(5196,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{for(const width of [320,375,390,430,1440])for(const lang of ['ko','en']){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:5196/?lang=${lang}#/meta`);await page.waitForFunction(()=>window.qa);
  const links=page.locator('#hot-content .insight-hero');assert.equal(await links.count(),3);assert.equal(await links.first().getAttribute('href'),'#/heroes/junker-queen');
  const details=page.locator('#hot-content details');assert.equal(await details.evaluate(el=>el.open),width>767);
  await page.locator('#hot-content').scrollIntoViewIfNeeded();await page.locator('#hot-content').screenshot({path:`${output}/${width}-${lang}-compact.png`});
  if(width<768)await details.locator('summary').click();
  assert.match(await details.innerText(),/0\.5/);assert.match(await details.innerText(),/KST/);assert.match(await page.locator('#hot-content').innerText(),/13\.8/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#hot-content').screenshot({path:`${output}/${width}-${lang}-expanded.png`});
  // Test-only empty candidate condition; never persisted as statistics.
  await page.evaluate(()=>{qa.model.state.statistics.records=qa.model.state.previousSnapshot.records;qa.view.render(qa.model)});
  assert.equal(await page.locator('#hot-content .insight-hero').count(),0);assert.equal(await page.locator('#hot-content > p').textContent(),await page.evaluate(()=>qa.t('hot.empty')));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);results.push({width,lang,pass:true,errors});await page.close();
 }fs.writeFileSync(output+'/browser.json',JSON.stringify({source:'actual stored Asia diamond observations; empty-state check uses test-only equal-values condition',results},null,2));console.log({passed:results.length});}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
