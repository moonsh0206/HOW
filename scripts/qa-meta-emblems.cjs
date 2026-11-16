// Captured real roster/statistics. Daily deltas and isolated S/A/B/C/D samples
// are presentation-only fixtures; no operating data file is written.
const {chromium}=require('../node_modules/.cache/how-mobile-qa/node_modules/playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const phase=process.argv[2]??'after',out=`docs/qa/meta-emblems/${phase}`;fs.mkdirSync(out,{recursive:true});
 const baselineSha=execFileSync('git',['rev-parse',process.argv[3]??'HEAD'],{encoding:'utf8',windowsHide:true}).trim();
 const baselineFiles=new Map();if(phase==='before')for(const file of ['index.html','src/views/heroView.js','src/views/tierReasonView.js','src/views/heroDetailView.js'])baselineFiles.set(file,execFileSync('git',['show',`${baselineSha}:${file}`],{encoding:'utf8',windowsHide:true}));
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const {expandSnapshotFile}=await import('../src/models/snapshotV2Model.js');
 const index=read('public/data/snapshots/index.json'),entry=index.snapshots.findLast(e=>e.filters.region==='asia'&&e.filters.division==='diamond');
 const snapshot=expandSnapshotFile(read('public/data/snapshots/'+entry.file)).find(s=>s.filters.division==='diamond');
 const payload={snapshot,heroes:read('tests/fixtures/overfast-heroes.json'),english:read('docs/qa/phase5/heroes-en.json'),detail:read('tests/fixtures/overfast-genji.json'),detailEn:read('docs/qa/phase5/genji-en.json')};
 let html=(baselineFiles.get('index.html')??fs.readFileSync('index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('%BASE_URL%','/public/');
 const styles=['main','detail','layout','filters','navigation','player','interactions'];if(phase==='after')styles.push('metaEmblems');
 html=html.replace('</head>',styles.map(s=>`<link rel="stylesheet" href="/src/styles/${s}.css">`).join('')+'</head>');
 html+=`<script type="module">
 import {setLanguage} from '/src/i18n/i18n.js';import {translateStatic} from '/src/i18n/languageView.js';
 import {createHeroModel,normalizeHeroes} from '/src/models/heroModel.js';import {createHeroView} from '/src/views/heroView.js';
 import {createHeroDetailView} from '/src/views/heroDetailView.js';import {normalizeHeroDetail} from '/src/models/heroDetailModel.js';
 import {tierButton} from '/src/views/tierReasonView.js';import {buildRankFrame,RANK_ROLES} from '/src/models/rankArchiveModel.js';import {rankDay} from '/src/models/dailyRankModel.js';
 const data=${JSON.stringify(payload)},lang=new URL(location.href).searchParams.get('lang')??'ko';setLanguage(lang);document.documentElement.lang=lang;translateStatic();
 const heroes=normalizeHeroes(lang==='en'?data.english:data.heroes),model=createHeroModel(['genji','ana']);
 const today=rankDay(new Date().toISOString())+'T01:00:00.000Z',yesterday=new Date(Date.parse(today)-86400000).toISOString();
 const current={...data.snapshot,fetchedAt:today},previous=buildRankFrame({heroes,current:{...current,fetchedAt:yesterday}});
 for(const role of RANK_ROLES)previous.ranks[role].reverse();
 const archive={schemaVersion:1,cohorts:[buildRankFrame({heroes,current,previous})]};
 Object.assign(model.state,{heroes,statistics:current,statsFilters:current.filters,status:'ready',statsStatus:'ready',role:'damage',dailyRankArchive:archive});
 const view=createHeroView(),detailView=createHeroDetailView();const render=()=>view.render(model);render();
 document.querySelectorAll('.role-filters [data-role]').forEach(b=>b.addEventListener('click',()=>{model.state.role=b.dataset.role;render();}));
 document.addEventListener('click',e=>{const b=e.target.closest('[data-favorite]');if(b){model.state.favorites.has(b.dataset.favorite)?model.state.favorites.delete(b.dataset.favorite):model.state.favorites.add(b.dataset.favorite);render();}});
 const gallery=document.createElement('div');gallery.id='qa-tier-gallery';gallery.style.cssText='display:flex;justify-content:center;gap:12px;padding:20px;background:#151c27;border:1px solid #354155';
 for(const tier of ['S','A','B','C','D'])gallery.append(tierButton({key:'sample-'+tier,name:'Visual fixture',tier}));document.querySelector('#heroes').prepend(gallery);
 window.qa={model,view,render,detail(){document.querySelector('#list-page').hidden=true;document.querySelector('#hero-detail-page').hidden=false;detailView.render({status:'ready',result:{detail:normalizeHeroDetail(lang==='en'?data.detailEn:data.detail,'genji'),fetchedAt:today}},model,{key:'genji',tab:'overview'});},gallery};
 </script>`;
 const root=process.cwd(),server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/'){res.setHeader('content-type','text/html');res.end(html);return;}if(baselineFiles.has(p.slice(1))){res.setHeader('content-type','text/javascript');res.end(baselineFiles.get(p.slice(1)));return;}const file=path.resolve(root,'.'+(p.startsWith('/assets/')?'/public'+p:p));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(5201,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{for(const width of [1440,390,320])for(const lang of ['ko','en']){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',locale:lang==='ko'?'ko-KR':'en-US'}),errors=[],iconResponses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/roles/'))iconResponses.push({url:r.url(),status:r.status()});});
  await page.route('https://**/*',r=>r.abort());await page.goto(`http://127.0.0.1:5201/?lang=${lang}`);await page.waitForFunction(()=>window.qa);await page.locator('#heroes').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#qa-tier-gallery [data-tier]').count(),5);
  await page.screenshot({path:`${out}/${width}-${lang}-list.png`});await page.locator('#qa-tier-gallery').screenshot({path:`${out}/${width}-${lang}-grades.png`});
  const centers=width===1440?await page.evaluate(()=>{const row=document.querySelector('#hero-rows tr');return [2,3].map(i=>{const th=document.querySelectorAll('#table-wrap th')[i],td=row.children[i],mark=td.querySelector('.meta-tier-emblem,.role-icon-badge')??td.firstElementChild;const a=th.getBoundingClientRect(),b=mark.getBoundingClientRect();return {column:i+1,offset:Math.abs(a.x+a.width/2-b.x-b.width/2)};});}):[];
  if(phase==='after'){assert(centers.every(c=>c.offset<1));assert.equal(await page.locator('#hero-rows .role-icon-badge').count(),await page.locator('#hero-rows tr').count());for(const role of ['tank','damage','support']){const button=page.locator('.role-filters [data-role='+role+']');assert(await button.getAttribute('aria-label'));assert(await button.getAttribute('title'));}assert.equal(await page.locator('#qa-tier-gallery .meta-tier-emblem').count(),5);assert.equal(iconResponses.length,3);assert(iconResponses.every(r=>r.status===200));}
  const movements=await page.locator('#hero-cards .rank-change').allTextContents();assert(movements.some(t=>t.startsWith('▲'))&&movements.some(t=>t.startsWith('▼'))&&movements.includes('='));
  const notes=page.locator(width===1440?'#hero-rows tr:has(.recommendation-label)':'#hero-cards .hero-card:has(.recommendation-label)');
  if(await notes.count()){await notes.first().scrollIntoViewIfNeeded();await notes.first().screenshot({path:`${out}/${width}-${lang}-conditional.png`});}
  if(phase==='after'){
   const collisions=await page.evaluate(()=>{const visible=el=>el.getBoundingClientRect().width>0;const notes=[...document.querySelectorAll('#heroes .recommendation-label')].filter(visible);return notes.flatMap(el=>{const box=el.closest('td')??el.closest('.hero-card-stats > div');if(!box)return [];const a=el.getBoundingClientRect(),b=box.getBoundingClientRect();return a.left<b.left-.5||a.right>b.right+.5||a.bottom>b.bottom+.5?[{text:el.textContent,note:{x:a.x,y:a.y,w:a.width,h:a.height},cell:{x:b.x,y:b.y,w:b.width,h:b.height}}]:[];});});assert.deepEqual(collisions,[],'Recommendation labels must stay inside their tier column');
   const rankOverlap=await page.evaluate(()=>[...document.querySelectorAll('#hero-cards .hero-card-header')].some(header=>{const rank=header.querySelector('.hero-ordinal').getBoundingClientRect(),identity=header.querySelector('.hero-identity').getBoundingClientRect();return rank.width>0&&rank.right>identity.left+.5;}));assert.equal(rankOverlap,false);
  }
  await page.evaluate(()=>{qa.model.state.favoritesOnly=true;qa.model.state.role='all';qa.render();});await page.locator('#heroes').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${width}-${lang}-favorites.png`});assert.equal(await page.locator('#hero-cards .hero-card').count(),2);
  await page.evaluate(()=>{qa.detail();scrollTo(0,0);});await page.waitForTimeout(50);await page.screenshot({path:`${out}/${width}-${lang}-detail.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({width,lang,centers,iconResponses,movementFixtures:true,overflow:false,errors});await page.close();
 }fs.writeFileSync(out+'/results.json',JSON.stringify({source:'captured real roster and statistics; synthetic movement history and grade gallery only for presentation QA; before uses tracked UI source without modifying workspace',baselineSha,phase,results},null,2));console.log(JSON.stringify(results));}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
