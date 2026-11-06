import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { DEFAULT_FILTERS as UI_DEFAULT_FILTERS, ALL_RANK_FILTERS } from '../src/models/statisticsModel.js';
const DEFAULT_FILTERS={...UI_DEFAULT_FILTERS,division:'diamond'}; // Explicit original-cohort regression fixture.
import { normalizeSnapshot, isObservationTime } from '../src/models/snapshotModel.js';
import { buildPickHistory, withCurrentPickHistory } from '../src/models/pickHistoryModel.js';
import { createSnapshotService } from '../src/services/snapshotService.js';
import { renderPickHistory, historyScale } from '../src/views/pickHistoryView.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { parseSnapshotFilters } from '../scripts/snapshot-options.js';
import { createRoutingController } from '../src/controllers/routingController.js';
import { createHeroModel } from '../src/models/heroModel.js';
const now=Date.parse('2026-11-03T00:00:00Z');
const raw=(collectedAt,pickRate,patch='p1',filters=DEFAULT_FILTERS)=>({schemaVersion:1,source:'OverFast API',collectedAt,filters:{...filters},aggregateAt:null,patch,records:[{hero:'ana',winrate:50,pickrate:pickRate,banrate:0}]});
const snap=(...args)=>normalizeSnapshot(raw(...args));
const build=(snapshots,days=7)=>buildPickHistory(snapshots,'ana',DEFAULT_FILTERS,{days,now});

test('current pick observation: exact cohort/time, cache/stale metadata, zero and duplicate handling',()=>{
  const history={status:'ready',days:7,result:build([])};
  const statistics={filters:{...DEFAULT_FILTERS},fetchedAt:'2026-11-02T00:00:00Z',records:[{hero:'ana',pickRate:20.2}],cached:true,stale:true,providerAgeSeconds:12};
  const combined=withCurrentPickHistory(history,statistics,'ana',DEFAULT_FILTERS);
  assert.equal(combined.result.points.length,1);assert.equal(combined.current.pickRate,20.2);assert.equal(combined.current.collectedAt,statistics.fetchedAt);
  assert.equal(combined.current.cached,true);assert.equal(combined.current.stale,true);assert.equal(combined.current.providerAgeSeconds,12);
  assert.equal(history.result.points.length,0);
  assert.equal(withCurrentPickHistory(history,statistics,'ana',ALL_RANK_FILTERS).result.points.length,0);
  assert.equal(withCurrentPickHistory(history,{...statistics,fetchedAt:'bad'},'ana',DEFAULT_FILTERS).result.points.length,0);
  assert.equal(withCurrentPickHistory(history,{...statistics,records:[{hero:'ana',pickRate:null}]},'ana',DEFAULT_FILTERS).result.points.length,0);
  assert.equal(withCurrentPickHistory(history,{...statistics,records:[{hero:'ana',pickRate:0}]},'ana',DEFAULT_FILTERS).current.pickRate,0);
  const duplicate={...history,result:build([snap(statistics.fetchedAt,20.2,null)])};
  assert.equal(withCurrentPickHistory(duplicate,statistics,'ana',DEFAULT_FILTERS).result.points.length,1);
});

test('current point remains visible while archive fails; live value and original fetch stamp are labelled',()=>{
  const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
  try{
    const state=withCurrentPickHistory({status:'error',days:30,error:'503'}, {filters:DEFAULT_FILTERS,fetchedAt:'2026-11-02T00:00:00Z',records:[{hero:'ana',pickRate:20.2}],cached:true,stale:true},'ana',DEFAULT_FILTERS);
    const panel=renderPickHistory(state,DEFAULT_FILTERS);
    assert.equal(panel.querySelectorAll('.history-point').length,1);assert.equal(panel.querySelectorAll('.history-segment').length,0);
    assert(panel.textContent.includes('현재 픽률 20.2%'));assert(panel.textContent.includes('오래된 데이터'));
    assert(panel.querySelector('[data-action="history-retry"]'));
  }finally{globalThis.document=prior;dom.window.close();}
});

test('history scale: bounded, padded and never magnifies a tiny difference to the full plot',()=>{
  for (const values of [[0],[100],[3.11,3.12],[99.9,100],[0,100],[40,60]]) {
    const scale=historyScale(values.map(pickRate=>({pickRate})));
    assert(scale.min>=0&&scale.max<=100&&scale.max-scale.min>=10);
    assert(values.every(value=>value>=scale.min&&value<=scale.max));
    assert.equal(scale.ticks[0],scale.max);assert.equal(scale.ticks.at(-1),scale.min);
  }
});

test('actual Genji detail DOM: diamond empty, all-rank single point, period controls and fetch error',async()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/overfast-genji.json',import.meta.url),'utf8'));
  const dom=new JSDOM(html,{url:'https://example.github.io/HOW/#/heroes/genji'});
  const prior={document:globalThis.document,window:globalThis.window,location:globalThis.location};
  Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});
  let router,fail=false;
  try {
    const model=createHeroModel();model.state.statsFilters={...DEFAULT_FILTERS};const service=createSnapshotService({now:()=>now,base:'/HOW/',fetcher:async url=>{
      if(fail)throw new TypeError('network');
      return {ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../public/'+url.replace('/HOW/',''),import.meta.url),'utf8'))};
    }});
    router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{async getHero(){return {detail:normalizeHeroDetail(fixture,'genji'),fetchedAt:new Date(now).toISOString()};}},historyService:{getHistory(...args){if(fail)return Promise.reject(new Error('network'));return service.getHistory(...args);}}});
    const flush=()=>new Promise(resolve=>setImmediate(resolve));router.start();await flush();await flush();
    const panel=()=>document.querySelector('#pick-history');
    assert.equal(document.querySelector('#hero-detail-page').hidden,false);
    assert(panel().parentElement.matches('.detail-summary-main'));assert(panel().closest('.detail-summary'));assert(panel().previousElementSibling.matches('.detail-metrics'));
    assert(document.querySelector('.detail-summary-top .counter-panel'));
    assert.equal(panel().querySelector('h2').textContent,'픽률 · 패치·관측 이력');
    assert(!panel().hidden);assert.equal(panel().querySelectorAll('[data-history-days]').length,0);
    assert(panel().textContent.includes('기록 수집 중'));assert.equal(panel().querySelector('svg'),null);
    // Mock current API value tests the integration, not a value saved to public data.
    model.state.statistics={filters:{...DEFAULT_FILTERS},fetchedAt:'2026-11-02T12:00:00Z',records:[{hero:'genji',pickRate:20.2}],cached:false,stale:false};
    router.refresh();
    assert.equal(panel().querySelectorAll('.history-point').length,1);assert(panel().textContent.includes('현재 픽률 20.2%'));
    router.refresh();assert.equal(document.querySelectorAll('#pick-history').length,1);
    model.state.statsFilters={...ALL_RANK_FILTERS};router.refresh();await flush();await flush();
    assert.equal(panel().querySelectorAll('.history-point').length,1);
    assert(panel().textContent.includes('저장 이력'));
    fail=true;model.state.statsFilters={...DEFAULT_FILTERS,region:'europe'};router.refresh();await flush();await flush();
    assert(panel().querySelector('[data-action="history-retry"]'));
    fail=false;panel().querySelector('[data-action="history-retry"]').click();await flush();await flush();
    assert.equal(panel().querySelectorAll('.history-point').length,0);
  } finally {router?.stop();dom.window.close();Object.assign(globalThis,prior);}
});
test('history: zero/single/sorted multiple, null vs zero and exact values',()=>{
  assert.equal(build([]).points.length,0);
  const a=snap('2026-11-02T00:00:00Z',0),b=snap('2026-11-02T06:00:00Z',12.34);
  assert.equal(build([a]).points[0].pickRate,0);
  const result=build([b,a]);assert.deepEqual(result.points.map(p=>p.pickRate),[0,12.34]);assert.equal(result.segments.length,1);
  assert.equal(build([snap('2026-11-02T03:00:00Z',null)]).points.length,0);
});
test('history: strict complete cohort, hero keys, dates and range never combine populations',()=>{
  const a=snap('2026-11-02T00:00:00Z',12);
  assert.equal(build([a,snap('2026-11-02T01:00:00Z',99,'p1',ALL_RANK_FILTERS),snap('2026-11-02T02:00:00Z',99,'p1',{...DEFAULT_FILTERS,region:'europe'})]).points.length,1);
  assert.equal(build([{...a,records:[{hero:'genji',pickRate:99}]}]).points.length,0);
  assert.equal(build([{...a,filters:{region:'asia'}}]).points.length,0);
  assert.equal(build([{...a,collectedAt:'not-date'}]).points.length,0);
  assert.equal(isObservationTime('2026-02-31T00:00:00Z'),false);assert.throws(()=>snap('2026-02-31T00:00:00Z',10));
  assert.equal(build([snap('2026-10-20T00:00:00Z',4)]).points.length,0);assert.equal(build([snap('2026-10-20T00:00:00Z',4)],30).points.length,1);
  assert.equal(build([snap('2026-11-04T00:00:00Z',4)]).points.length,0);
  assert.throws(()=>build([],14));assert.throws(()=>buildPickHistory([],'ana',DEFAULT_FILTERS,{now:NaN}));
});
test('history: duplicate instant collapse; conflicts and invalid/missing hero observations break segments',()=>{
  const a=snap('2026-11-02T00:00:00Z',10),b=snap('2026-11-02T06:00:00Z',20),c=snap('2026-11-02T12:00:00Z',30);
  assert.equal(build([a,{...a,collectedAt:'2026-11-02T00:00:00.000Z'}]).points.length,1);
  const conflict=build([a,b,{...b,records:[{hero:'ana',pickRate:21}]},c]);assert.equal(conflict.points.length,2);assert.equal(conflict.segments.length,0);assert(conflict.warnings.length);
  for(const missing of [[],[{hero:'ana',pickRate:null}],[{hero:'ana',pickRate:101}],[{hero:'ana',pickRate:'20'}]]) assert.equal(build([a,{...b,records:missing},c]).segments.length,0);
});
test('history: unknown patch, changed patch and >24h gap never receive a connecting line',()=>{
  const a=snap('2026-11-01T00:00:00Z',10),b=snap('2026-11-01T06:00:00Z',11);
  assert.equal(build([a,b]).segments.length,1);
  assert.equal(build([a,{...b,patch:'p2'}]).segments.length,0);
  assert.equal(build([{...a,patch:null},{...b,patch:null}]).segments.length,0);
  assert.equal(build([a,snap('2026-11-02T12:00:00Z',12)]).segments.length,0);
});
test('snapshot history service: Pages base, shared HOT/index/file requests and strict filter keys',async()=>{
  const data=[raw('2026-11-02T00:00:00Z',10),raw('2026-11-02T06:00:00Z',11),raw('2026-11-02T12:00:00Z',99,null,ALL_RANK_FILTERS)];
  const entries=data.map(d=>({file:d.collectedAt.replaceAll(':','-')+'.json',collectedAt:d.collectedAt,filters:d.filters}));const calls=[];
  const service=createSnapshotService({base:'/HOW/',now:()=>now,fetcher:async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('index.json')?{schemaVersion:1,snapshots:entries}:data[entries.findIndex(e=>url.endsWith(e.file))]};}});
  const [history,previous]=await Promise.all([service.getHistory(DEFAULT_FILTERS),service.getPrevious(DEFAULT_FILTERS,'2026-11-03T00:00:00Z')]);
  assert.equal(history.snapshots.length,2);assert.equal(previous.records[0].pickRate,10);assert.equal(calls.length,3);assert(calls.every(p=>p.startsWith('/HOW/data/snapshots/')));
  await service.getHistory(DEFAULT_FILTERS,{days:30});assert.equal(calls.length,3);
  assert.equal((await service.getHistory({...DEFAULT_FILTERS,region:'europe'})).snapshots.length,0);
});
test('history service: network failure, invalid files, partial errors and retriable gaps',async()=>{
  await assert.rejects(createSnapshotService({fetcher:async()=>{throw new TypeError('network');}}).getHistory(DEFAULT_FILTERS));
  const a=raw('2026-11-02T00:00:00Z',10),b=raw('2026-11-02T06:00:00Z',11);let fail=true;
  const entries=[a,b].map(d=>({file:d.collectedAt.replaceAll(':','-')+'.json',collectedAt:d.collectedAt,filters:d.filters}));
  const service=createSnapshotService({now:()=>now,fetcher:async url=>url.endsWith('index.json')?{ok:true,json:async()=>({schemaVersion:1,snapshots:entries})}:url.endsWith(entries[1].file)&&fail?{ok:false,status:503}:{ok:true,json:async()=>url.endsWith(entries[0].file)?a:b}});
  const result=await service.getHistory(DEFAULT_FILTERS);assert.equal(result.snapshots.length,1);assert.equal(result.warnings.length,1);assert.equal(result.gaps.length,1);
  fail=false;assert.equal((await service.getHistory(DEFAULT_FILTERS)).snapshots.length,2);
  const invalid=createSnapshotService({now:()=>now,fetcher:async url=>({ok:true,json:async()=>url.endsWith('index.json')?{schemaVersion:1,snapshots:[entries[0]]}:{...a,filters:ALL_RANK_FILTERS}})});
  assert.equal((await invalid.getHistory(DEFAULT_FILTERS)).snapshots.length,0);
});
test('real archive: stored all-rank observations never become diamond history as collection grows',async()=>{
  const index=JSON.parse(fs.readFileSync(new URL('../public/data/snapshots/index.json',import.meta.url),'utf8'));assert(index.snapshots.some(entry=>entry.filters.division==='all'));
  const service=createSnapshotService({now:()=>now,fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../public/'+url.replace(/^\//,''),import.meta.url),'utf8'))})});
  const diamond=await service.getHistory(DEFAULT_FILTERS),all=await service.getHistory(ALL_RANK_FILTERS);
  assert(diamond.snapshots.every(s=>s.filters.division==='diamond'));
  assert(all.snapshots.length>=1);assert(all.snapshots.every(s=>s.filters.division==='all'));
  assert(!diamond.snapshots.some(d=>all.snapshots.some(a=>a.collectedAt===d.collectedAt&&a.filters.division===d.filters.division)));
});
test('collector options: legacy all stays default, explicit diamond works, invalid combinations fail',()=>{
  assert.deepEqual(parseSnapshotFilters(),ALL_RANK_FILTERS);assert.deepEqual(parseSnapshotFilters(['--division','diamond']),DEFAULT_FILTERS);
  for(const args of [['--division'],['--division','diamond','--division','all'],['--region','bad'],['--gamemode','quickplay','--division','diamond'],['--patch','fake']])assert.throws(()=>parseSnapshotFilters(args));
});
test('history DOM: precise points, touch/click/keyboard, accessible table, no data and disabled seasons',()=>{
  const dom=new JSDOM('<body></body>'),previous=globalThis.document;globalThis.document=dom.window.document;
  try{
    const series=build([snap('2026-11-02T00:00:00Z',0),snap('2026-11-02T06:00:00Z',12.34)]);
    const panel=renderPickHistory({status:'ready',days:7,result:series},DEFAULT_FILTERS);document.body.append(panel);
    assert.equal(panel.querySelectorAll('.history-point').length,2);assert.equal(panel.querySelectorAll('.history-segment').length,1);
    assert.equal(panel.querySelector('select'),null);assert.equal(panel.querySelector('.history-source'),null);assert.equal(panel.querySelectorAll('.history-table tbody tr').length,2);
    panel.querySelector('.history-point').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));assert(panel.querySelector('.history-observation').textContent.includes('픽률 0%'));
    panel.querySelectorAll('.history-point')[1].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(panel.querySelector('.history-observation').textContent.includes('12.34%'));
    assert(renderPickHistory({status:'ready',result:build([])},DEFAULT_FILTERS).textContent.includes('기록 수집 중'));
    assert.equal(renderPickHistory({status:'ready',result:build([snap('2026-11-02T00:00:00Z',1)])},DEFAULT_FILTERS).querySelectorAll('.history-point').length,1);
    assert(renderPickHistory({status:'error',error:'503'},DEFAULT_FILTERS).querySelector('[data-action="history-retry"]'));
  }finally{globalThis.document=previous;dom.window.close();}
});
test('history routing: range/cohort/hero races discard late data and errors can retry',async()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://example.com/#/heroes/ana'}),prior={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
  let router;try{
    const model=createHeroModel(),requests=[],renders=[];const service={getHistory(filters,options){return new Promise((resolve,reject)=>requests.push({filters,options,resolve,reject}));}};
    router=createRoutingController({model,historyService:service,detailService:{async getHero(key){return {detail:{key},fetchedAt:'test'};}},detailView:{render(d,m,r,c,h){renders.push({key:r.key,...h});},focusHeading(){}}});
    const flush=()=>new Promise(r=>setImmediate(r));router.start();await flush();assert.equal(requests.length,1);
    model.state.statsFilters={...DEFAULT_FILTERS,region:'europe'};router.refresh();await flush();assert.equal(requests.length,2);
    requests[1].resolve({snapshots:[],observedUntil:new Date(now).toISOString()});await flush();
    requests[0].resolve({snapshots:[snap('2026-11-02T00:00:00Z',99)],observedUntil:new Date(now).toISOString()});await flush();assert.equal(renders.at(-1).result.points.length,0);
    model.state.statsFilters={...DEFAULT_FILTERS,region:'americas'};router.refresh();await flush();assert.equal(requests.at(-1).options.scope,'compare');
    requests.at(-1).reject(new Error('503'));await flush();assert.equal(renders.at(-1).status,'error');
    const retry=document.createElement('button');retry.dataset.action='history-retry';document.body.append(retry);retry.click();await flush();
    requests.at(-1).resolve({snapshots:[],observedUntil:new Date(now).toISOString()});await flush();assert.equal(renders.at(-1).status,'ready');
    location.hash='#/heroes/genji';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();assert.equal(renders.at(-1).key,'genji');assert.equal(requests.at(-1).options.scope,'compare');
  }finally{router?.stop();dom.window.close();Object.assign(globalThis,prior);}
});
