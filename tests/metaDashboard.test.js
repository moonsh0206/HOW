import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {DEFAULT_FILTERS,statisticsQuery} from '../src/models/statisticsModel.js';
import {originalProvenance} from '../src/models/statisticsProvenance.js';
import {dashboardSelection,pickLeaders,roleWinHistory} from '../src/models/metaDashboardModel.js';
import {createMetaDashboardController} from '../src/controllers/metaDashboardController.js';
import {createCounterService} from '../src/services/counterService.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {localizedURL,routeHash} from '../src/i18n/routes.js';
import {setLanguage} from '../src/i18n/i18n.js';
import {dashboardHistoryChart} from '../src/views/dashboardHistoryView.js';
const roster=normalizeHeroes(JSON.parse(fs.readFileSync('tests/fixtures/overfast-heroes.json','utf8')));
const filters={...DEFAULT_FILTERS,division:'all'};
const records=roster.map((h,i)=>({hero:h.key,winRate:48+i/10,pickRate:2+i/4,banRate:i/10}));
const snapshot=(at,rows=records)=>({filters:{...filters},collectedAt:at,fetchedAt:at,records:rows,source:'OverFast API',provenance:originalProvenance(filters),patch:null,statisticsWindow:'unverified-patch-window'});
function model(){const m=createHeroModel();Object.assign(m.state,{heroes:roster,status:'ready',statsFilters:{...filters},statsStatus:'ready',statistics:snapshot('2026-11-18T01:00:00Z')});return m;}
test('dashboard role pick leaders use pick rate, preserve zero, exclude review and never mutate inputs',()=>{
 const heroes=[{key:'a',role:'tank',statistics:{winRate:60,pickRate:2}},{key:'b',role:'tank',statistics:{winRate:50,pickRate:8}},{key:'c',role:'damage',statistics:{winRate:51,pickRate:0}},{key:'d',role:'support',statistics:{winRate:0,pickRate:9}}];const before=JSON.stringify(heroes);
 assert.deepEqual(pickLeaders(heroes).map(x=>x.hero?.key??null),['b','c',null]);assert.equal(JSON.stringify(heroes),before);
});
test('dashboard ranking exactly shares HOW order without touching list search/favorites/sort/role; invalid cohorts withheld',()=>{
 const m=model(),expected=m.sortedHeroes().map(h=>h.key);Object.assign(m.state,{sort:'name-desc',role:'support',query:'ana',favoritesOnly:true});const before={...m.state};
 assert.deepEqual(dashboardSelection(m).sorted.map(h=>h.key),expected);assert.equal(m.state.role,before.role);assert.equal(m.state.sort,before.sort);assert.equal(m.state.query,before.query);assert(m.state.favoritesOnly);
 assert(dashboardSelection(m,'tank').sorted.every(h=>h.role==='tank'));m.state.statistics.filters={...filters,region:'europe'};assert.equal(dashboardSelection(m).current,null);assert(dashboardSelection(m).leaders.every(x=>x.hero===null));
});
test('recent changes reuse HOT compatibility gate and retain raw before/after precision',()=>{
 const m=model(),key=roster[0].key;const changed=records.map(r=>r.hero===key?{...r,winRate:r.winRate+.75,pickRate:r.pickRate+1.25,banRate:r.banRate+.3333}:r);
 m.state.statistics=snapshot('2026-11-18T01:00:00Z',changed);m.state.previousSnapshot=snapshot('2026-11-17T01:00:00Z');const d=dashboardSelection(m);assert(d.hot.available);assert.equal(d.hot.heroes[0].key,key);assert(d.deltas.some(r=>r.metric==='banRate'&&Math.abs(r.delta-.3333)<1e-9));
 m.state.previousSnapshot={...m.state.previousSnapshot,filters:{...filters,map:'busan'}};assert.equal(dashboardSelection(m).deltas.length,0);assert.equal(dashboardSelection(m).hot.available,false);
 m.state.statsStatus='stale';assert.equal(dashboardSelection(m).current,null);
});
test('role history selects latest KST observation/day; no means for missing/review heroes, no mixed cohorts/patches/future dates',()=>{
 const history={observedUntil:'2026-11-18T02:00:00Z',snapshots:[snapshot('2026-11-16T01:00:00Z'),snapshot('2026-11-17T01:00:00Z'),snapshot('2026-11-17T02:00:00Z',records.map(r=>({...r,winRate:r.winRate+1}))),snapshot('2026-11-19T01:00:00Z')]};
 const d=roleWinHistory(history,roster,filters);assert(d.available);assert.equal(d.series[0].points.length,2);assert.equal(d.series[0].points.at(-1).observedAt,'2026-11-17T02:00:00Z');
 const tank=roster.find(h=>h.role==='tank').key;history.snapshots[2].records=records.filter(r=>r.hero!==tank);assert.equal(roleWinHistory(history,roster,filters).series[0].points.at(-1).value,null);
 history.snapshots[2].filters={...filters,region:'europe'};assert.equal(roleWinHistory(history,roster,filters).series[0].points.length,2); // valid earlier same-cohort rows survive; Europe is excluded
 const different={...snapshot('2026-11-17T01:00:00Z'),patch:'unknown-new'};const boundary=roleWinHistory({observedUntil:history.observedUntil,snapshots:[history.snapshots[0],different]},roster,filters);assert.equal(boundary.series[0].points.length,2);assert.equal(boundary.series[0].points[1].connectPrevious,false); // retain observations without connecting incompatible windows
 assert.equal(roleWinHistory({snapshots:[]},roster,filters).available,false);
});
test('saved production snapshots are read with existing service; no last-week trend is invented',async()=>{
 const service=createSnapshotService({now:()=>Date.parse('2026-11-18T01:00:00Z'),fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+url.replace(/^\//,''),'utf8'))})});
 const history=await service.getHistory(DEFAULT_FILTERS,{days:7});assert.equal(history.snapshots.length,0);assert.equal(roleWinHistory(history,roster,DEFAULT_FILTERS).available,false);
 const older=await service.getHistory(DEFAULT_FILTERS,{days:30});assert(older.snapshots.length>0);assert.equal(roleWinHistory(older,roster,DEFAULT_FILTERS,{days:30}).available,false); // one actual grouped batch
});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
test('hologram layers keep independent heading/card visibility and release their shared observer',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),previous=globalThis.document;globalThis.document=dom.window.document;let observer,disconnected=0;
 dom.window.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observer=this;}observe(target){this.targets.push(target);}disconnect(){disconnected++;}};
 const {createMetaDashboardView}=await import('../src/views/metaDashboardView.js');const root=document.querySelector('section'),view=createMetaDashboardView(root),m=model();
 try{view.render(m,{role:'all',days:7,mapKey:'busan',metric:'pickRate',history:{status:'ready'},map:{status:'idle'},maps:[]},dashboardSelection(m));const films=[...root.querySelectorAll('.dashboard-feature .dashboard-hologram')],heading=root.querySelector('.dashboard-heading'),highlights=root.querySelector('.dashboard-highlights');assert.equal(films.length,4);assert.equal(heading.querySelectorAll('.dashboard-hologram').length,1);assert.equal(heading.querySelector('.dashboard-hologram').dataset.holoRole,'heading');assert(films.every(e=>e.getAttribute('aria-hidden')==='true'&&e.children.length===2));assert.deepEqual(films.map(e=>e.dataset.holoRole),['tank','damage','support','spotlight']);for(const [layer,min,max]of [['a',16000,20000],['b',22000,28000],['c',12000,18000]]){const periods=films.map(e=>parseFloat(e.style.getPropertyValue('--holo-'+layer+'-duration')));assert(periods.every(n=>n>=min&&n<=max));assert.equal(new Set(periods).size,4);assert(films.every(e=>parseFloat(e.style.getPropertyValue('--holo-'+layer+'-delay'))<=0));}assert.deepEqual(observer.targets,[heading,highlights]);observer.callback([{target:heading,isIntersecting:false}]);assert(root.classList.contains('dashboard-heading-offscreen'));assert(!root.classList.contains('dashboard-hologram-offscreen'));observer.callback([{target:highlights,isIntersecting:false},{target:heading,isIntersecting:true}]);assert(root.classList.contains('dashboard-hologram-offscreen'));assert(!root.classList.contains('dashboard-heading-offscreen'));observer.callback([{target:highlights,isIntersecting:true}]);assert(!root.classList.contains('dashboard-hologram-offscreen'));}finally{view.destroy();assert.equal(disconnected,1);dom.window.close();globalThis.document=previous;}
});
test('mobile rank expansion retains six real rows and cycle dots track the shared metric across translated refreshes',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document;globalThis.document=dom.window.document;
 const {createMetaDashboardView}=await import('../src/views/metaDashboardView.js');const m=model(),root=document.querySelector('section'),view=createMetaDashboardView(root);
 const local={role:'all',days:7,mapKey:'busan',metric:'pickRate',cycle:{metric:'pickRate',automatic:false},history:{status:'ready',snapshots:[]},map:{status:'idle'},maps:[]};
 try{
  const data=dashboardSelection(m);view.render(m,local,data);
  assert.equal(root.querySelectorAll('#dashboard-rank-rows tr').length,6);
  const button=root.querySelector('.dashboard-rank-more');assert.equal(button.getAttribute('aria-expanded'),'false');button.click();assert.equal(button.getAttribute('aria-expanded'),'true');
  const rows=[...root.querySelectorAll('#dashboard-rank-rows tr')].map(e=>e.dataset.dashboardHero);
  for(const lang of ['en','ja','ko']){setLanguage(lang);view.render(m,local,data);assert.equal(button.getAttribute('aria-expanded'),'true');assert.deepEqual([...root.querySelectorAll('#dashboard-rank-rows tr')].map(e=>e.dataset.dashboardHero),rows);}
  for(const metric of ['winRate','banRate','pickRate']){view.updateCycle({metric,automatic:true});assert.equal(root.querySelector('.dashboard-cycle-dots .is-active').dataset.cycleDot,metric);assert.equal(root.querySelectorAll('.dashboard-cycle-dots .is-active').length,1);}
  assert.equal(root.querySelectorAll('.dashboard-card-slot').length,3);assert.equal(root.querySelectorAll('.dashboard-spotlight').length,1);assert.equal(root.querySelector('.dashboard-spotlight .dashboard-meta-flame').textContent,data.spotlight.metaScore.toFixed(1));
 }finally{view.destroy();dom.window.close();globalThis.document=prior;setLanguage('ko');}
});
test('dashboard shares cached services, guards old replies, keeps local role/period and translates live controls',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document;globalThis.document=dom.window.document;
 const m=model(),requests=[],historyCalls=[];let c;
 try{
  c=createMetaDashboardController({model:m,counterService:createCounterService(),snapshotService:{async getHistory(f,o){historyCalls.push([f,o]);return {snapshots:[],observedUntil:'2026-11-18T01:00:00Z'};}},statisticsService:{getStatistics(f){return new Promise(resolve=>requests.push({f,resolve}));}}});
  c.setActive(true);await flush();assert.equal(requests.length,1);c.setActive(true);c.refresh();await flush();assert.equal(requests.length,1);assert.equal(historyCalls.length,1);
  const source=m.state.statistics;document.querySelector('[data-dashboard-role=tank]').click();assert.equal(m.state.role,'all');assert(document.querySelectorAll('[data-dashboard-hero]').length<=6);
  const map=document.querySelector('#dashboard-map');map.value='kings-row';map.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();assert.equal(requests.length,2);
  requests[0].resolve(snapshot('2026-11-18T01:00:00Z'));requests[1].resolve({...snapshot('2026-11-18T01:00:00Z'),filters:requests[1].f});await flush();assert.equal(m.state.statistics,source);assert.equal(document.querySelector('#dashboard-map').value,'kings-row');
  for(const lang of ['en','ja','ko']){setLanguage(lang);c.refresh();await flush();assert.equal(document.querySelector('#dashboard-map').value,'kings-row');assert.equal(document.querySelector('[data-dashboard-role=tank]').getAttribute('aria-pressed'),'true');assert.equal(document.querySelectorAll('#dashboard-map-trigger').length,1);}
  const malicious={...roster[0],name:'<img src=x onerror=alert(1)>'};m.state.heroes=[malicious,...roster.slice(1)];c.refresh();assert.equal(document.querySelectorAll('[onerror]').length,0);
  c.setActive(false);assert.equal(historyCalls.length,1);c.setActive(true);await flush();assert.equal(requests.length,2);
 }finally{c?.stop();dom.window.close();globalThis.document=prior;setLanguage('ko');}
});
test('dashboard URL defaults and localized static route coexist with all legacy deep links',()=>{
 for(const base of ['/','/HOW/'])for(const lang of ['ko','en','ja']){
  assert.equal(localizedURL('#/dashboard',lang,base),base+lang+'/dashboard');assert.equal(routeHash({pathname:base+lang+'/',hash:''},base),'#/dashboard');
  assert.equal(routeHash({pathname:base+lang+'/tiers',hash:''},base),'#/tiers');assert.equal(localizedURL('#heroes',lang,base),base+lang+'/tiers#heroes');
 }
});
test('history SVG leaves gaps, preserves exact points, fixed labels and a textual alternative',()=>{
 const dom=new JSDOM('<main></main>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{const points=[{day:'2026-11-15',time:Date.parse('2026-11-15T01:00:00Z'),value:50,count:2},{day:'2026-11-16',value:null,count:2},{day:'2026-11-17',time:Date.parse('2026-11-17T01:00:00Z'),value:52,count:2}];const before=JSON.stringify(points);const chart=dashboardHistoryChart({available:true,series:[{role:'tank',points}]});assert.equal(chart.querySelectorAll('circle').length,2);assert.equal(chart.querySelector('path').getAttribute('d').match(/M/g).length,2);assert.equal(chart.querySelector('path').getAttribute('d').includes('L'),false);assert.equal(chart.querySelectorAll('table tr').length,2);assert(chart.querySelector('svg[role=img]'));assert.equal(JSON.stringify(points),before);}finally{globalThis.document=prior;dom.window.close();}
});
test('history/map failures are independent, retryable and never erase current cards or request while inactive',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document;globalThis.document=dom.window.document;let c,hits=0,mapHits=0;
 try{const m=model();c=createMetaDashboardController({model:m,counterService:createCounterService(),snapshotService:{async getHistory(){hits++;if(hits===1)throw Error('history fixture failure');return {snapshots:[]};}},statisticsService:{async getStatistics(f){mapHits++;if(mapHits===1)throw Error('map fixture failure');return {...snapshot('2026-11-18T01:00:00Z'),filters:f};}}});
 assert.equal(hits,0);c.setActive(true);assert.equal(document.querySelectorAll('.dashboard-feature').length,4);await flush();assert(document.querySelector('[data-dashboard-retry=history]'));assert(document.querySelector('[data-dashboard-retry=map]'));assert.equal(document.querySelectorAll('.dashboard-feature[data-hero-key]').length,4);
 document.querySelector('[data-dashboard-retry=history]').click();document.querySelector('[data-dashboard-retry=map]').click();await flush();assert.equal(hits,2);assert.equal(mapHits,2);assert.equal(document.querySelectorAll('.dashboard-map-row .dashboard-hero').length,3);c.setActive(false);c.refresh();await flush();assert.equal(hits,2);
 }finally{c?.stop();globalThis.document=prior;dom.window.close();}
});
test('dashboard removes explanation-only disclosures while keeping source, filters, ranks and navigation',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),prior=globalThis.document;globalThis.document=dom.window.document;let c;
 try{const m=model();c=createMetaDashboardController({model:m,counterService:createCounterService(),snapshotService:{async getHistory(){return {snapshots:[]};}},statisticsService:{async getStatistics(f){return {...snapshot('2026-11-18T01:00:00Z'),filters:f};}}});c.setActive(true);await flush();
  assert.equal(document.querySelectorAll('.dashboard-feature').length,4);assert.equal(document.querySelectorAll('.dashboard-panel').length,5);assert.equal(document.querySelectorAll('[data-dashboard-hero]').length,6);
  assert.equal(document.querySelector('.dashboard-feature-note summary,.dashboard-method'),null);
  assert(document.querySelector('.dashboard-source').textContent.includes('OverFast API'));
  assert(document.querySelector('#dashboard-maps .dashboard-map-credit').href.startsWith('https://'));
  const role=document.querySelector('[data-dashboard-role=damage]');role.focus();role.click();
  assert.equal(document.activeElement,role);assert.equal(role.getAttribute('aria-pressed'),'true');
  assert.equal(document.querySelector('.dashboard-method'),null);assert.equal(document.querySelectorAll('.dashboard-feature').length,4);

 }finally{c?.stop();globalThis.document=prior;dom.window.close();}
});
