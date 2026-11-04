import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import fixture from './fixtures/history-observations.json' with {type:'json'};
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {withCurrentMetricHistory} from '../src/models/pickHistoryModel.js';
import {renderMetricHistory} from '../src/views/pickHistoryView.js';
import {BASELINE_META_POLICY,LOCAL_META_EXPERIMENT,ALTERNATIVE_META_POLICY,selectMetaPolicy} from '../src/domain/metaPolicies.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {dailyCollectionDecision} from '../src/models/snapshotCollectionModel.js';
import {parseSnapshotRequest} from '../scripts/snapshot-request.js';
const now=Date.parse('2026-11-03T00:00:00Z'),filters=fixture.filters;
const data=()=>fixture.snapshots.map(s=>({...structuredClone(s),filters:{...filters}}));
const build=(snapshots,metric='pickRate',extra={})=>buildObservationTimeline(snapshots,'genji',filters,{metric,now,...extra});

test('observation fixture: two dated points for all three metrics; actual values/timestamps and dashed comparison DOM',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{
  for(const [metric,values,label] of [['winRate',[50,52],'승률'],['pickRate',[10,12],'픽률'],['banRate',[1,3],'밴률']]){
   const result=build(data(),metric);assert.deepEqual(result.points.map(p=>p.value),values);assert.equal(result.comparisonSegments.length,1);assert(result.points.every(p=>p.verificationStatus==='unverified'&&p.patch===null&&p.stored));
   const panel=renderMetricHistory({metric,status:'ready',result},filters);assert.equal(panel.querySelectorAll('.history-point').length,2);assert.equal(panel.querySelectorAll('.history-comparison').length,1);
   const marks=panel.querySelectorAll('.history-point');assert(marks[0].getAttribute('aria-label').includes(`${values[0]}%`));assert(marks[1].getAttribute('aria-label').includes(`${values[1]}%`));
   marks[0].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(panel.querySelector('.history-observation').textContent.includes(`${label} ${values[0]}%`));
   assert.equal(result.points[0].collectedAt,'2026-11-01T00:00:00Z');assert.equal(result.points[1].collectedAt,'2026-11-02T00:00:00Z');assert.equal(panel.querySelectorAll('.history-table tbody tr').length,2);
   assert(panel.textContent.includes('원본 집계 기간이 다를 수 있습니다'));
  }
 }finally{globalThis.document=prior;dom.window.close();}
});
test('observations: unchanged values remain two points, missing hero breaks line and mixed ranks/maps/region excluded',()=>{
 const rows=data();rows[1].records=structuredClone(rows[0].records);
 assert.deepEqual(build(rows).points.map(p=>p.value),[10,10]);
 assert.equal(build([rows[0]]).points.length,1);
 assert.equal(build([rows[0],{...rows[1],filters:{...filters,division:'all'}},{...rows[1],filters:{...filters,map:'busan'}},{...rows[1],filters:{...filters,region:'europe'}}]).points.length,1);
 const missing={...rows[1],collectedAt:'2026-11-01T12:00:00Z',records:[]};
 const result=build([rows[0],missing,rows[1]]);assert.equal(result.points.length,2);assert.equal(result.comparisonSegments.length,0);
 assert.equal(buildObservationTimeline(rows,'missing',filters,{now}).points.length,0);
});
test('verified patches: all actual observations visible, first verified representative marked, cross-patch line only comparative',()=>{
 const catalog=[{id:'test-p1',type:'balance',effectiveAt:'2026-10-29T00:00:00Z',sourceUrl:'https://example.test/p1'},{id:'test-p2',type:'balance',effectiveAt:'2026-10-30T00:00:00Z',sourceUrl:'https://example.test/p2'}];
 const rows=data().map((s,i)=>({...s,patch:catalog[i].id,patchVerification:{status:'verified',catalogId:catalog[i].id,sourceUrl:catalog[i].sourceUrl,statisticsWindow:'since-patch-start',verifiedAt:'2026-11-03T00:00:00Z'}}));
 const result=build(rows,'pickRate',{catalog});assert.equal(result.points.length,2);assert(result.points.every(p=>p.representative&&p.verificationStatus==='verified'));assert.equal(result.segments.length,0);assert.equal(result.comparisonSegments.length,1);
});
test('browser query is distinct from saved points and never creates duplicates for identical observation instant',()=>{
 const history={status:'ready',result:build(data())};
 const stats={filters,fetchedAt:'2026-11-02T06:00:00Z',records:[{hero:'genji',pickRate:13}],cached:true};
 const combined=withCurrentMetricHistory(history,stats,'genji',filters);
 assert.equal(combined.result.points.length,3);assert.equal(combined.result.points.at(-1).stored,false);assert.equal(history.result.points.length,2);
 const same=withCurrentMetricHistory(history,{...stats,fetchedAt:'2026-11-02T00:00:00Z',records:[{hero:'genji',pickRate:12}]},'genji',filters);
 assert.equal(same.result.points.length,2);assert(same.result.points.at(-1).stored&&same.result.points.at(-1).current);
 assert.equal(withCurrentMetricHistory(history,{...stats,filters:{...filters,division:'all'}},'genji',filters).result.points.length,2);
});
test('local experiment opt-in, production baseline and both candidate policies keep original S gates',()=>{
 assert.equal(selectMetaPolicy({development:false,experiment:'60-27-13'}),BASELINE_META_POLICY);assert.equal(selectMetaPolicy({development:true}),BASELINE_META_POLICY);assert.equal(selectMetaPolicy({development:true,experiment:'60-27-13'}),LOCAL_META_EXPERIMENT);
 assert.deepEqual(BASELINE_META_POLICY.weights,{winRate:.65,pickRate:.25,banRate:.10});
 const source=JSON.parse(fs.readFileSync(new URL('../docs/research/tier-design/evidence.json',import.meta.url)));
 for(const policy of [BASELINE_META_POLICY,LOCAL_META_EXPERIMENT,ALTERNATIVE_META_POLICY]){const model=createHeroModel([],{metaPolicy:policy});model.state.heroes=source.heroes.records;model.state.statistics={filters:source.cases[3].filters,records:source.cases[3].api.records.map(r=>({hero:r.hero,winRate:r.winrate,pickRate:r.pickrate,banRate:r.banrate}))};
  assert(model.enrichedHeroes().filter(h=>h.tier==='S').every(h=>h.eligibility.every(r=>r.passed)));
 }
});
test('daily throttle: explicit reviewed new patch event bypasses daily limit once without granting patch attribution',()=>{
 const request=parseSnapshotRequest(['--division','diamond','--event','ow-2026-11-03']);assert.equal(request.filters.division,'diamond');
 const entries=[{filters,collectedAt:'2026-11-02T23:00:00Z'}];
 assert.equal(dailyCollectionDecision(entries,filters,now).collect,false);
 assert.equal(dailyCollectionDecision(entries,filters,now,request.eventId).collect,true);
 assert.equal(dailyCollectionDecision([...entries,{...entries[0],observationEvent:request.eventId}],filters,now,request.eventId).collect,false);
 assert.throws(()=>parseSnapshotRequest(['--event','made-up']));
});
