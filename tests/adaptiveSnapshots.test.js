import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptiveCollectionDecision,describeObservationChanges} from '../src/models/adaptiveSnapshotModel.js';
import {collectAdaptiveRegions} from '../scripts/lib/adaptiveBatch.js';
import {redundantBatch} from '../scripts/lib/batchPersistence.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {DEFAULT_FILTERS,normalizeStatistics} from '../src/models/statisticsModel.js';
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {hotHeroes} from '../src/domain/insights.js';
import {archiveRetentionPlan} from '../src/models/snapshotArchiveModel.js';
const DAY=86400000,start=Date.parse('2026-10-01T00:00:00Z');
const patch={id:'fixture',effectiveAt:new Date(start).toISOString(),type:'balance'};
test('adaptive milestones, unknown attribution, budgets and no retrospective milestone fabrication',()=>{
 for(const day of [1,3,7,14,21,28]){const d=adaptiveCollectionDecision({patch,now:start+day*DAY});assert.equal(d.milestone,`D+${day}`);assert.equal(d.patchVerified,false);}
 assert.equal(adaptiveCollectionDecision({patch:{...patch,effectiveAt:null},now:start+DAY}).collect,false);
 assert.equal(adaptiveCollectionDecision({patch,now:start+DAY-1}).collect,false);
 const o={targetPatch:patch.id,milestone:'D+1',collectedAt:new Date(start+DAY).toISOString()};
 assert.equal(adaptiveCollectionDecision({patch,observations:[o],now:start+2*DAY}).collect,false);
 assert.equal(adaptiveCollectionDecision({patch,observations:[o],now:start+2*DAY,extraRequested:true}).milestone,'extra-72h');
 assert.equal(adaptiveCollectionDecision({patch,observations:[o,{...o,milestone:'extra-72h',collectedAt:new Date(start+2*DAY).toISOString()}],now:start+2.5*DAY,extraRequested:true}).collect,false);
 assert.equal(adaptiveCollectionDecision({patch,now:start+3*DAY,attempts:[{at:new Date(start+2.5*DAY).toISOString()},{at:new Date(start+2.6*DAY).toISOString()}]}).reason,'attempt-budget');
});
test('three regions: 27 serial original requests, 16 matching views each; no network in dry-run',async()=>{
 let calls=0;const options={patch,heroKeys:['genji'],now:()=>start+DAY,service:{async getStatistics(filters){calls++;return {filters,fetchedAt:new Date(start+DAY).toISOString(),providerAgeSeconds:20,records:normalizeStatistics([{hero:'genji',winrate:51,pickrate:8,banrate:0}])};}}};
 const dry=await collectAdaptiveRegions(options);assert.equal(calls,0);assert.equal(dry.results.reduce((n,r)=>n+r.plannedRequests,0),27);
 const run=await collectAdaptiveRegions({...options,dryRun:false});assert.equal(calls,27);
 for(const {region,batch} of run.results){const views=expandSnapshotFile(batch,{includeDerived:true});assert.equal(views.length,16);assert(views.every(s=>s.filters.region===region));assert(views.every(s=>s.patch===null));assert(views.every(s=>s.records[0].banRate===0));assert.equal(batch.divisions.diamond.cacheAgeSeconds,20);assert(redundantBatch(batch,structuredClone(batch)));const old=structuredClone(batch);old.batchId+='old';delete old.derived;assert(redundantBatch(batch,old));old.divisions.diamond.records[0][0]=52;delete old.derived;delete old.divisions.diamond.qualitySummary;assert.equal(redundantBatch(batch,old),false);}
 assert.equal(DEFAULT_FILTERS.division,'diamond_plus');
});
test('stored changes require two actual same-cohort observations; null/review excluded, HOT one-day boundary',()=>{
 const filters={...DEFAULT_FILTERS,division:'diamond'},row={hero:'genji',winRate:51,pickRate:8,banRate:0};
 const a={source:'OverFast API',filters,patch:null,collectedAt:new Date(start).toISOString(),records:[row]},b={...a,collectedAt:new Date(start+DAY).toISOString(),records:[{...row,winRate:52,pickRate:10,banRate:1}]};
 const changes=describeObservationChanges(a,b);assert.equal(changes.find(c=>c.metric==='pickRate').delta,2);assert.throws(()=>describeObservationChanges(a,{...b,filters:{...filters,region:'europe'}}));
 for(const metric of ['winRate','pickRate','banRate']){const history=buildObservationTimeline([a,b],'genji',filters,{metric,now:start+DAY});assert.equal(history.points.length,2);assert.equal(history.storedChange.delta,b.records[0][metric]-row[metric]);assert.equal(history.points[0].stored,true);}
 assert.equal(buildObservationTimeline([a],'genji',filters,{now:start+DAY}).storedChange,null);
 const heroes=[{key:'genji',statistics:b.records[0]}];assert.equal(hotHeroes(heroes,{...b,fetchedAt:b.collectedAt},a).available,true);assert.equal(hotHeroes(heroes,{...b,fetchedAt:new Date(start+DAY-1).toISOString()},a).available,false);
 const invalid={...b,records:[{...row,winRate:0}]};assert(!describeObservationChanges(a,invalid).some(r=>r.metric==='winRate'));
});
test('retention is dry-run only: v1, unknown/review, milestone and recent observations protected',()=>{
 const old=new Date(start).toISOString(),base={schemaVersion:2,collectedAt:old,reviewStatus:'complete'};
 const entries=[{...base,file:'v1',schemaVersion:1},{...base,file:'pending',reviewStatus:'pending'},{...base,file:'milestone',milestones:['D+3']},{...base,file:'recent',collectedAt:new Date(start+29*DAY).toISOString()},{...base,file:'old-detail'}];
 const before=JSON.stringify(entries),plan=archiveRetentionPlan(entries,{now:start+30*DAY});assert.equal(plan.dryRun,true);assert.deepEqual(plan.candidates,['old-detail']);assert.equal(JSON.stringify(entries),before);
});
test('verified same-patch D+1/D+3/D+7 remain three points, with only first representative',()=>{
 const p={...patch,sourceUrl:'https://example.test/official-patch',name:'Fixture patch'},filters={...DEFAULT_FILTERS,division:'diamond'};
 const rows=[1,3,7].map(day=>({source:'OverFast API',filters,collectedAt:new Date(start+day*DAY).toISOString(),patch:p.id,patchVerification:{status:'verified',catalogId:p.id,sourceUrl:p.sourceUrl,statisticsWindow:'since-patch-start',verifiedAt:new Date(start+day*DAY).toISOString()},records:[{hero:'genji',winRate:50+day,pickRate:day,banRate:0}]}));
 const result=buildObservationTimeline(rows,'genji',filters,{catalog:[p],now:start+8*DAY});assert.equal(result.points.length,3);assert.equal(result.points.filter(p=>p.representative).length,1);assert.equal(result.points[0].representative,true);assert.deepEqual(result.points.map(p=>p.value),[1,3,7]);
});
