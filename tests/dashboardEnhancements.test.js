import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {dashboardSelection,pickLeaders,roleWinHistory} from '../src/models/metaDashboardModel.js';
import {safeMapScreenshot,normalizeMaps} from '../src/models/mapModel.js';
import {createDashboardCycle,DASHBOARD_CYCLE_MS} from '../src/controllers/dashboardCycle.js';
import {deriveRoleMeans} from '../scripts/derive-role-means.js';
import {normalizeRoleMeanArchive,meanRoleRecords,ROLE_MEAN_VERSION} from '../src/models/roleMeanModel.js';
import {createRoleMeanService} from '../src/services/roleMeanService.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {DEFAULT_FILTERS,statisticsQuery} from '../src/models/statisticsModel.js';
import {normalizeHeroes,createHeroModel} from '../src/models/heroModel.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {createMetaDashboardController} from '../src/controllers/metaDashboardController.js';
import {createCounterService} from '../src/services/counterService.js';
import {createMetaDashboardView} from '../src/views/metaDashboardView.js';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
test('whole-card slide preserves fixed slots, transitions same-hero metrics, cancels stale work and respects reduced motion',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document,media=globalThis.matchMedia,motion=new EventTarget();motion.matches=false;globalThis.document=dom.window.document;globalThis.matchMedia=()=>motion;let view;const animations=[];
 dom.window.HTMLElement.prototype.animate=function(frames,options){const a={target:this,frames,options,cancelled:false,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};animations.push(a);return a;};
 try{const m=createHeroModel(),heroes=normalizeHeroes(await read('tests/fixtures/overfast-heroes.json'));Object.assign(m.state,{heroes,status:'ready',statsStatus:'ready',statistics:{filters:{...DEFAULT_FILTERS},records:heroes.map(h=>({hero:h.key,winRate:50,pickRate:8,banRate:1})),fetchedAt:'2026-11-18T01:00:00Z'}});
  const local={metric:'pickRate',role:'all',days:7,mapKey:'busan',history:{status:'ready',result:{snapshots:[]}},map:{status:'error'},maps:[]};view=createMetaDashboardView(document.querySelector('#dashboard-page'));const render=metric=>{local.metric=metric;const data=dashboardSelection(m,'all',metric);data.history={available:false,series:[]};return view.render(m,local,data);};render('pickRate');
  const shells=[...document.querySelectorAll('.dashboard-card-slot')],firstCard=shells[0].firstChild,flame=document.querySelector('.dashboard-meta-flame');assert(flame);assert.match(flame.textContent,/^\d+\.\d$/);assert.equal(document.querySelectorAll('[data-dashboard-metric]').length,0);
  render('winRate');assert.deepEqual([...document.querySelectorAll('.dashboard-card-slot')],shells);assert.notEqual(shells[0].lastChild,firstCard);assert.equal(document.querySelectorAll('.dashboard-card-exit').length,3);assert([...document.querySelectorAll('.dashboard-card-exit')].every(e=>e.inert&&e.getAttribute('aria-hidden')==='true'&&!e.hasAttribute('data-feature-role')));assert(animations.some(a=>a.options.duration===520&&a.frames[0].transform==='translateY(28px)'&&a.target.classList.contains('dashboard-feature')));assert(animations.some(a=>a.frames.at(-1).transform==='translateY(-28px)'));
  render('banRate');assert.equal(document.querySelectorAll('.dashboard-card-exit').length,3);assert.equal(document.querySelector('.dashboard-meta-flame'),flame);
  const decodes=[];dom.window.HTMLImageElement.prototype.decode=()=>new Promise(resolve=>decodes.push(resolve));render('winRate');render('pickRate');decodes.forEach(resolve=>resolve());await new Promise(r=>setImmediate(r));assert([...document.querySelectorAll('.dashboard-feature:not(.dashboard-card-exit) .dashboard-feature-content>h2')].every(e=>e.textContent.includes('\uD53D\uB960')));
  motion.matches=true;motion.dispatchEvent(new Event('change'));assert.equal(document.querySelectorAll('.dashboard-card-exit').length,0);assert(animations.every(a=>a.cancelled));view.cancelMotion();assert.equal(document.querySelectorAll('.dashboard-card-exit').length,0);
 }finally{view?.destroy();globalThis.document=prior;globalThis.matchMedia=media;dom.window.close();}
});
test('map screenshot strict HTTPS, exact map key and provider path; failure remains an empty fallback',()=>{
 const url='https://overfast-api.tekrop.fr/static/maps/busan.jpg';assert.equal(safeMapScreenshot(url,'busan'),url);
 for(const value of ['javascript:alert(1)','data:image/png,abc','http://overfast-api.tekrop.fr/static/maps/busan.jpg','https://evil.test/static/maps/busan.jpg','https://x:y@overfast-api.tekrop.fr/static/maps/busan.jpg',url+'?x=1',url+'#x','https://overfast-api.tekrop.fr/static/maps/ilios.jpg'])assert.equal(safeMapScreenshot(value,'busan'),'');
 const maps=normalizeMaps([{key:'busan',name:'Busan',uses:['standard'],gamemodes:['control'],screenshot:url}]);assert.equal(maps[0].screenshot,url);assert.equal(maps[0].key,'busan');assert.equal(safeMapScreenshot(url,'.*'),'');
});
test('role metric leaders rotate independently from Meta Score; all ties use immutable hero keys',()=>{
 const heroes=[{key:'b',role:'tank',statistics:{winRate:55,pickRate:2,banRate:1}},{key:'a',role:'tank',statistics:{winRate:55,pickRate:1,banRate:9}},{key:'c',role:'tank',statistics:{winRate:50,pickRate:10,banRate:2}},{key:'zero',role:'support',statistics:{winRate:50,pickRate:0,banRate:0}},{key:'review',role:'damage',statistics:{winRate:0,pickRate:40,banRate:80}}];const original=JSON.stringify(heroes);
 assert.equal(pickLeaders(heroes,'pickRate')[0].hero.key,'c');assert.equal(pickLeaders(heroes,'winRate')[0].hero.key,'a');assert.equal(pickLeaders(heroes,'banRate')[0].hero.key,'a');assert.equal(pickLeaders(heroes,'banRate')[1].hero,null);assert.equal(pickLeaders(heroes,'banRate')[2].hero.key,'zero');assert.equal(JSON.stringify(heroes),original);assert.throws(()=>pickLeaders(heroes,'metaScore'));
});

test('same-cohort refresh retains actual TOP values; different cohorts and unavailable data never borrow them',async()=>{
 const model=createHeroModel();Object.assign(model.state,{heroes:normalizeHeroes(await read('tests/fixtures/overfast-heroes.json')),status:'ready',statsStatus:'ready',statistics:{filters:{...DEFAULT_FILTERS},records:[{hero:'genji',winRate:51,pickRate:12,banRate:2}],stale:false}});
 const before=dashboardSelection(model).leaders;model.state.statsStatus='loading';assert.deepEqual(dashboardSelection(model).leaders,before);
 model.state.statsFilters={...DEFAULT_FILTERS,region:'europe'};assert(dashboardSelection(model).leaders.every(row=>!row.hero));
 model.state.statsFilters={...DEFAULT_FILTERS};model.state.statsStatus='error';assert(dashboardSelection(model).leaders.every(row=>!row.hero));
});
function fakeCycle(reduce=false){const doc=new EventTarget(),media=new EventTarget();Object.defineProperty(doc,'hidden',{value:false,writable:true});media.matches=reduce;let id=0;const timers=new Map(),changes=[];const c=createDashboardCycle({document:doc,window:{matchMedia:()=>media},setTimer(fn,delay){assert.equal(delay,DASHBOARD_CYCLE_MS);timers.set(++id,fn);return id;},clearTimer:key=>timers.delete(key),onMetric:key=>changes.push(key)});return {doc,media,timers,changes,c,tick(){assert.equal(timers.size,1);const [key,fn]=[...timers][0];timers.delete(key);fn();}};}
test('single 5.5s settled-display timer: synchronized pick/win/ban cycle and no duplicates across route refreshes',()=>{
 const h=fakeCycle();h.c.setActive(true);h.c.setActive(true);assert.equal(h.timers.size,1);h.tick();h.tick();h.tick();assert.deepEqual(h.changes,['winRate','banRate','pickRate']);h.c.setActive(false);assert.equal(h.timers.size,0);h.c.setActive(true);assert.equal(h.timers.size,1);h.c.destroy();assert.equal(h.timers.size,0);
});
test('manual, hover, focus, hidden document and reduced motion pause without catch-up or polling',()=>{
 const h=fakeCycle();h.c.setActive(true);h.c.setHover(true);assert.equal(h.timers.size,0);h.c.setHover(false);h.c.setFocus(true);assert.equal(h.timers.size,0);h.c.setFocus(false);h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.timers.size,0);h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.timers.size,1);
 h.c.select('banRate');assert.deepEqual(h.changes,['banRate']);assert.equal(h.timers.size,0);h.c.toggle();assert.equal(h.timers.size,1);h.media.matches=true;h.media.dispatchEvent(new Event('change'));assert.equal(h.timers.size,0);h.media.matches=false;h.media.dispatchEvent(new Event('change'));assert.equal(h.timers.size,1);h.c.destroy();
 const reduced=fakeCycle(true);reduced.c.setActive(true);assert.equal(reduced.timers.size,0);reduced.c.select('winRate');assert.deepEqual(reduced.changes,['winRate']);reduced.c.destroy();
});
test('means keep equal hero weights, real zeros, strict complete-roster coverage and dynamic role counts',()=>{
 const heroes=[{key:'a',role:'tank'},{key:'b',role:'tank'},{key:'c',role:'damage'}];
 const result=meanRoleRecords([{hero:'a',winRate:0,pickRate:2,quality:{fields:{winRate:'verified'}}},{hero:'b',winRate:60,pickRate:90},{hero:'c',winRate:null}],heroes);
 assert.equal(result.tank.value,30);assert.equal(result.tank.count,2);assert.equal(result.damage.value,null);assert.equal(result.damage.excludedCount,1);assert.equal(result.support.targetCount,0);assert.equal(result.support.value,null);
});
test('derive existing real originals/composites exactly once, byte protect original files and idempotent atomic output',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'how-role-means-')),output=path.join(dir,'observations.json');
 try{const names=await fs.readdir('public/data/snapshots'),hashes=await Promise.all(names.map(async name=>createHash('sha256').update(await fs.readFile('public/data/snapshots/'+name)).digest('hex')));
  const manifest=await read('public/data/snapshots/index.json'),files=[...new Set(manifest.snapshots.map(r=>r.file))],frames=(await Promise.all(files.map(async file=>expandSnapshotFile(await read('public/data/snapshots/'+file),{includeDerived:true})))).flat();
  const first=await deriveRoleMeans({output,apply:true});assert.equal(first.files,files.length);assert.equal(first.observations,frames.length);assert.equal(first.archive.aggregateVersion,ROLE_MEAN_VERSION);for(const division of ['diamond_plus','master_plus'])assert.equal(first.archive.observations.filter(o=>o.filters.division===division).length,frames.filter(f=>f.filters.division===division).length);
  const bytes=await fs.readFile(output),second=await deriveRoleMeans({output,apply:true});assert.equal(second.changed,false);assert.deepEqual(await fs.readFile(output),bytes);assert.deepEqual(await Promise.all(names.map(async name=>createHash('sha256').update(await fs.readFile('public/data/snapshots/'+name)).digest('hex'))),hashes);
  const bad=path.join(dir,'bad');await fs.mkdir(bad);await fs.writeFile(path.join(bad,'index.json'),JSON.stringify({snapshots:[{file:'../escape.json'}]}));await assert.rejects(deriveRoleMeans({directory:bad,output,apply:true}));assert.deepEqual(await fs.readFile(output),bytes);
  const key=new Set();for(const o of first.archive.observations){const id=statisticsQuery(o.filters)+o.collectedAt;assert(!key.has(id));key.add(id);assert(o.sources.every(s=>s.sha256.length===64));}
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('same-origin mean service matches raw snapshot computation for diamond+/master+/individual; roster/version/cohort/expiry validation',async()=>{
 const {archive}=await deriveRoleMeans(),heroes=normalizeHeroes(await read('tests/fixtures/overfast-heroes.json'));let calls=0,clock=Date.parse('2026-11-07T12:00:00Z');
 const service=createRoleMeanService({base:'/HOW/',now:()=>clock,fetcher:async url=>{calls++;assert.equal(url,'/HOW/data/role-means/observations.json');return {ok:true,json:async()=>archive};}});
 const snapshots=createSnapshotService({base:'/',now:()=>clock,fetcher:async url=>({ok:true,json:async()=>read('public/'+url.slice(1))})});
 for(const division of ['diamond_plus','master_plus','diamond']){const filters={...DEFAULT_FILTERS,division};const [raw,saved]=await Promise.all([snapshots.getHistory(filters,{days:7}),service.getHistory(filters,{days:7,heroes})]);const calculated=roleWinHistory(raw,heroes,filters,{days:7});assert.deepEqual(saved.series.map(s=>s.points.map(p=>[p.day,p.value,p.count,p.targetCount])),calculated.series.map(s=>s.points.map(p=>[p.day,p.value,p.count,p.targetCount])));}
 assert.equal(calls,1);clock+=600001;await service.getHistory(DEFAULT_FILTERS,{heroes});assert.equal(calls,2);await assert.rejects(service.getHistory(DEFAULT_FILTERS,{heroes:heroes.slice(1)}));await assert.rejects(service.getHistory(DEFAULT_FILTERS,{heroes,days:14}));assert.throws(()=>normalizeRoleMeanArchive({...archive,aggregateVersion:'unverified'}));const corrupt=structuredClone(archive);corrupt.observations[0].roles.tank.count=999;assert.throws(()=>normalizeRoleMeanArchive(corrupt));const badDate=structuredClone(archive);badDate.observations[0].date='2026-01-01';assert.throws(()=>normalizeRoleMeanArchive(badDate));
});
test('unavailable derived archive falls back to existing snapshot service without blocking current cards',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document;globalThis.document=dom.window.document;let c,archiveCalls=0,rawCalls=0;Object.defineProperty(dom.window.document,'hidden',{value:false,configurable:true});
 try{const m=createHeroModel(),heroes=normalizeHeroes(await read('tests/fixtures/overfast-heroes.json'));Object.assign(m.state,{heroes,status:'ready',statsStatus:'ready'});const response={filters:{...DEFAULT_FILTERS},records:heroes.map(h=>({hero:h.key,winRate:50,pickRate:8,banRate:1})),fetchedAt:'2026-11-18T01:00:00Z'};m.state.statistics=response;
  c=createMetaDashboardController({model:m,counterService:createCounterService(),roleMeanService:{async getHistory(){archiveCalls++;throw Error('corrupt archive fixture');}},snapshotService:{async getHistory(){rawCalls++;return {snapshots:[],observedUntil:'2026-11-18T01:00:00Z'};}},statisticsService:{async getStatistics(filters){return {...response,filters};}}});c.setActive(true);for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  assert.equal(archiveCalls,1);assert.equal(rawCalls,1);assert.equal(document.querySelectorAll('.dashboard-feature[data-hero-key]').length,4);assert.equal(document.querySelector('#dashboard-history [data-dashboard-retry]'),null);assert(document.querySelector('#dashboard-history .dashboard-empty'));
  const area=document.querySelector('.dashboard-highlights'),root=document.querySelector('#dashboard-page');area.dispatchEvent(new dom.window.MouseEvent('pointerenter'));assert(root.classList.contains('dashboard-motion-paused'));area.firstChild.querySelector('small')?.remove();area.dispatchEvent(new dom.window.MouseEvent('pointerleave',{relatedTarget:document.body}));assert.equal(root.classList.contains('dashboard-motion-paused'),false);
 }finally{c?.stop();globalThis.document=prior;dom.window.close();}
});

test('the next 5.5s dwell starts only after async content transition settles; pause and route exit cannot resurrect timers',async()=>{
 let resolve;const timers=new Map();let id=0;const c=createDashboardCycle({setTimer(fn,ms){assert.equal(ms,5500);timers.set(++id,fn);return id;},clearTimer:key=>timers.delete(key),onMetric:()=>new Promise(r=>resolve=r)});c.setActive(true);const tick=()=>{const [id,fn]=[...timers][0];timers.delete(id);fn();};tick();assert.equal(c.state().transitioning,true);assert.equal(timers.size,0);c.setHover(true);resolve();await Promise.resolve();assert.equal(timers.size,0);c.setHover(false);assert.equal(timers.size,1);tick();c.setActive(false);resolve();await Promise.resolve();assert.equal(timers.size,0);c.destroy();
});

 test('stalled image decode and animation completion are bounded; pending old metrics cannot overwrite a restored metric',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),old=globalThis.document,media=globalThis.matchMedia;globalThis.document=dom.window.document;globalThis.matchMedia=()=>({matches:false});let view;
 dom.window.HTMLImageElement.prototype.decode=()=>new Promise(()=>{});
 dom.window.HTMLElement.prototype.animate=()=>({finished:new Promise(()=>{}),cancel(){}});
 try{const model=createHeroModel();const heroes=normalizeHeroes(await read('tests/fixtures/overfast-heroes.json'));Object.assign(model.state,{heroes,status:'ready',statsStatus:'ready',statistics:{filters:DEFAULT_FILTERS,records:heroes.map(h=>({hero:h.key,winRate:50,pickRate:8,banRate:1}))}});const local={metric:'pickRate',role:'all',days:7,mapKey:'busan',history:{status:'ready'},map:{status:'error'},maps:[]};view=createMetaDashboardView(document.querySelector('#dashboard-page'));const draw=metric=>{local.metric=metric;const data=dashboardSelection(model,'all',metric);data.history={series:[]};return view.render(model,local,data);};draw('pickRate');const pending=draw('winRate');await pending;assert([...document.querySelectorAll('.dashboard-card-slot [data-metric]')].every(card=>card.dataset.metric==='winRate'));const oldPending=draw('banRate');draw('winRate');await oldPending;assert([...document.querySelectorAll('.dashboard-card-slot [data-metric]')].every(card=>card.dataset.metric==='winRate'));assert.equal(document.querySelectorAll('.dashboard-card-slot').length,3);
 }finally{view?.destroy();globalThis.document=old;globalThis.matchMedia=media;dom.window.close();}
 });
