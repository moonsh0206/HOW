import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {createDailyRankService} from '../src/services/dailyRankService.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createHeroController} from '../src/controllers/heroController.js';
import {createInsightView} from '../src/views/insightView.js';
import {hotHeroes} from '../src/domain/insights.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
import {rankChangeDiagnostic,buildRankFrame,RANK_ROLES} from '../src/models/rankArchiveModel.js';
const filters={...DEFAULT_FILTERS,division:'diamond'};
const at='2026-11-16T02:00:00.000Z';
const previous=(day,extra={})=>({schemaVersion:1,source:'OverFast API',aggregateAt:null,patch:null,filters,collectedAt:`2026-11-${day}T01:00:00.000Z`,records:[{hero:'ana',winrate:50,pickrate:5,banrate:0}],...extra});
const current={source:'OverFast API',filters,fetchedAt:at};
function provider(rows,{now=Date.parse(at),fail=[]}={}){
 const files=new Map(rows.map((row,i)=>[`2026-11-${row.collectedAt.slice(8,10)}T01-00-0${i}Z.json`,row]));
 return createSnapshotService({now:()=>now,fetcher:async url=>{const name=url.split('/').at(-1);if(fail.includes(name))return {ok:false,status:503};return {ok:true,json:async()=>name==='index.json'?{schemaVersion:1,snapshots:[...files].map(([file,s])=>({file,collectedAt:s.collectedAt,filters:s.filters}))}:files.get(name)};}});
}

test('HOT chooses most recent compatible candidate, preserving policy/window/provenance guards',async()=>{
 const service=provider([previous('12'),previous('13'),previous('14',{statisticsWindow:'since-patch-start'})]);
 const result=await service.getPreviousResult(filters,at,current);
 assert.equal(result.snapshot.collectedAt,previous('13').collectedAt);assert.equal(result.rejected.length,1);
 const incompatible=await provider([previous('14',{statisticsWindow:'since-patch-start'})]).getPreviousResult(filters,at,current);
 assert.equal(incompatible.reason,'incompatible');
 const badOrigin={...current,provenance:{provider:'other',kind:'original'}};
 assert.equal((await provider([previous('14')]).getPreviousResult(filters,at,badOrigin)).reason,'incompatible');
});

test('HOT distinguishes no prior, expired, recent-only and unreadable history; older valid files survive a failure',async()=>{
 assert.equal((await provider([]).getPreviousResult(filters,at,current)).reason,'no-history');
 assert.equal((await provider([previous('06')]).getPreviousResult(filters,at,current)).reason,'outside-window');
 assert.equal((await provider([previous('16')]).getPreviousResult(filters,at,current)).reason,'outside-window');
 await assert.rejects(provider([previous('14')],{fail:['2026-11-14T01-00-00Z.json']}).getPreviousResult(filters,at,current),/503/);
 const result=await provider([previous('13'),previous('14')],{fail:['2026-11-14T01-00-01Z.json']}).getPreviousResult(filters,at,current);
 assert.equal(result.status,'ready');assert.equal(result.warnings.length,1);
});

test('HOT composite recovery uses complete actual batch and current observation time at seven-day boundary',async()=>{
 const parts=['diamond','master','grandmaster'].map(division=>previous('09',{filters:{...filters,division},batchId:'real-batch',collectedAt:'2026-11-09T02:00:00.000Z'}));
 const composite={...current,filters:DEFAULT_FILTERS,provenance:{provider:'OverFast API',kind:'derived',cohort:'invalid'}};
 // Service without current compatibility check tests the same existing getPrevious contract.
 const service=provider(parts,{now:Date.parse(at)+3600000});
 const restored=await service.getPrevious(DEFAULT_FILTERS,at);
 assert(restored);assert.equal(restored.records[0].pickRate,5);assert.equal(restored.components.length,3);
 assert.equal((await service.getPreviousResult(DEFAULT_FILTERS,at,composite)).reason,'incompatible');
 assert.equal(await provider(parts.slice(0,2)).getPrevious(DEFAULT_FILTERS,at),null);
});

test('daily JSON cache expires, bypasses HTTP cache, refreshes at 10 KST and exposes HTTP failures',async()=>{
 let now=Date.parse('2026-11-16T00:59:00Z'),calls=0;
 const service=createDailyRankService({now:()=>now,fetcher:async(_url,options)=>{calls++;assert.equal(options.cache,'no-cache');return {ok:true,json:async()=>({schemaVersion:1,cohorts:[]})};}});
 await service.get();await service.get();assert.equal(calls,1);
 now+=60000;await service.get();assert.equal(calls,2);
 now+=300001;await service.get();assert.equal(calls,3);
 await assert.rejects(createDailyRankService({fetcher:async()=>({ok:false,status:404})}).get(),/404/);
});

test('rank suppression reason separates absent baseline, old day, wrong policy and live-order mismatch',()=>{
 const heroes=RANK_ROLES.flatMap(role=>[0,1].map(i=>({key:`${role}-${i}`,name:`${role}-${i}`,role})));
 const frame=time=>({filters,fetchedAt:time,records:heroes.map((h,i)=>({hero:h.key,winRate:60-i,pickRate:20-i,banRate:10-i}))});
 const a=buildRankFrame({heroes,current:frame('2026-11-15T01:02:00Z')}),b=buildRankFrame({heroes,current:frame(at),previous:a});
 const model=createHeroModel();Object.assign(model.state,{heroes,role:'tank',statistics:frame(at),statsFilters:filters});
 const input={archive:{schemaVersion:1,cohorts:[b]},heroes,filters,role:'tank',sorted:model.sortedHeroes(),now:at};
 assert.equal(rankChangeDiagnostic(input),'ready');
 assert.equal(rankChangeDiagnostic({...input,sorted:[...input.sorted].reverse()}),'live-order-mismatch');
 for(const [extra,reason] of [[{comparison:null},'no-consecutive-baseline'],[{date:'2026-11-15'},'reporting-day-mismatch'],[{policyId:'old'},'policy-mismatch']])assert.equal(rankChangeDiagnostic({...input,archive:{schemaVersion:1,cohorts:[{...b,...extra}]}}),reason);
});

test('PC/mobile KO/EN HOT states distinguish empty selection, old history, missing history, incompatibility and read error',async()=>{
 const html=await readFile('index.html','utf8');
 for(const lang of ['ko','en'])for(const width of [390,1440]){
  const dom=new JSDOM(html,{url:'https://example.org/HOW/'}),saved={window:globalThis.window,document:globalThis.document};
  Object.assign(globalThis,{window:dom.window,document:dom.window.document});dom.window.matchMedia=()=>({matches:width<768,addEventListener(){},removeEventListener(){}});setLanguage(lang);
  const model=createHeroModel();Object.assign(model.state,{heroes:[],statsStatus:'ready',statistics:current,statsFilters:filters,snapshotStatus:'empty'});
  const view=createInsightView();
  try{
   for(const reason of ['no-history','outside-window','incompatible']){model.state.hotDiagnostic={reason,latestAt:previous('06').collectedAt};view.render(model);const hot=document.querySelector('#hot-content');assert.equal(hot.dataset.hotStatus,reason);assert.equal(hot.querySelector('.insight-empty').textContent,t(`hot.${reason}`));assert.match(hot.textContent,/KST/);}
   Object.assign(model.state,{snapshotStatus:'error',snapshotError:'HTTP 503'});view.render(model);assert.equal(document.querySelector('#hot-content').dataset.hotStatus,'history-error');
   Object.assign(model.state,{snapshotStatus:'ready',previousSnapshot:previous('14'),hotDiagnostic:null});view.render(model);assert.equal(document.querySelector('#hot-content').dataset.hotStatus,'no-matches');assert.equal(document.querySelector('#hot-content > p').textContent,t('hot.empty'));
   Object.assign(model.state,{heroes:[{key:'ana',name:'Ana',role:'support'}],previousSnapshot:{...previous('14'),records:[{hero:'ana',winRate:50,pickRate:5,banRate:0}]},statistics:{...current,records:[{hero:'ana',winRate:51,pickRate:6,banRate:1,quality:{fields:{winRate:'review'}}}]}});view.render(model);assert.equal(document.querySelector('#hot-content').dataset.hotStatus,'quality-unavailable');assert.equal(document.querySelector('#hot-content > p').textContent,t('hot.quality-unavailable'));
  }finally{view.destroy();dom.window.close();Object.assign(globalThis,saved);setLanguage('ko');}
 }
});

test('cached controller startup restores HOT history and retains daily archive HTTP error diagnosis',async()=>{
 const dom=new JSDOM(await readFile('index.html','utf8'),{url:'https://example.org/HOW/'}),saved={window:globalThis.window,document:globalThis.document,location:globalThis.location,fetch:globalThis.fetch};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,fetch:async()=>({ok:false,status:404})});
 const model=createHeroModel();Object.assign(model.state,{statsFilters:filters,statistics:{...current,expiresAt:Date.now()+60000},statsStatus:'ready'});let historyCalls=0;
 const controller=createHeroController({model,view:{render(){}},autoRefresh:false,service:{async getHeroes(){return {heroes:[]};}},snapshotService:{async getPreviousResult(){historyCalls++;return {snapshot:null,status:'empty',reason:'outside-window'};}}});
 try{controller.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(historyCalls,1);assert.equal(model.state.hotDiagnostic.reason,'outside-window');assert.equal(model.state.dailyRankStatus,'archive-error');assert.match(model.state.dailyRankError,/404/);}
 finally{controller.stop();dom.window.close();Object.assign(globalThis,saved);}
});
