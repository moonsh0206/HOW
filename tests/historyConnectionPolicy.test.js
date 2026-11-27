import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPickHistory,withCurrentPickHistory} from '../src/models/pickHistoryModel.js';
import {normalizeSnapshot} from '../src/models/snapshotModel.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
const filters={...DEFAULT_FILTERS,division:'diamond'},now=Date.parse('2026-11-24T12:00:00Z');
const snap=(day,value=10,patch=null)=>normalizeSnapshot({schemaVersion:1,source:'OverFast API',aggregateAt:null,collectedAt:`2026-11-${day}T01:00:00Z`,filters,patch,records:[{hero:'ana',winrate:50,pickrate:value,banrate:0}]});
const build=rows=>buildPickHistory(rows,'ana',filters,{days:30,now});
const edges=r=>r.segments.length+r.comparisonSegments.length;
test('sparse actual dates connect without invented observations; seven-day range remains strict',()=>{
 const rows=[snap('24',12),snap('06'),snap('20',11)],r=build(rows);
 assert.deepEqual(r.points.map(p=>p.collectedAt.slice(8,10)),['06','20','24']);assert.equal(edges(r),2);
 assert.equal(buildPickHistory(rows,'ana',filters,{days:7,now}).points.length,2);
 assert.equal(r.connections[0].aggregationWindowComparable,false);
});
test('patch boundaries remain metadata; incompatible windows, provenance, missing and conflicts break chains',()=>{
 const a=snap('06',10,'p1'),b=snap('20',11,'p2'),c=snap('24',12,'p2');
 const r=build([a,b,c]);assert.equal(edges(r),2);assert.equal(r.comparisonSegments.length,1);assert.equal(r.connections[0].patchBoundary,true);
 assert.equal(edges(build([a,{...b,statisticsWindow:'since-patch-start'},c])),0);
 assert.equal(edges(build([a,{...b,source:'unknown',provenance:null},c])),0);
 assert.equal(edges(build([a,{...b,records:[]},c])),0);
 assert.equal(edges(build([a,b,snap('20',99,'p2'),c])),0);
 assert.equal(build([a,{...b,filters:{...filters,region:'europe'}},c]).points.length,2);
});
test('current observation is separate, exact-cohort, deduplicated and cannot bridge a conflicting marker',()=>{
 const a=snap('06'),b=snap('20',11),rows=[a,b],original=JSON.stringify(rows),history={result:build(rows)};
 const current={source:'OverFast API',filters,fetchedAt:'2026-11-24T01:00:00Z',records:[{hero:'ana',pickRate:12}]};
 const r=withCurrentPickHistory(history,current,'ana',filters);assert.equal(r.result.points.length,3);assert.equal(edges(r.result),2);assert.equal(r.result.points.at(-1).stored,false);assert.equal(JSON.stringify(rows),original);
 assert.equal(withCurrentPickHistory(history,{...current,filters:{...filters,region:'europe'}},'ana',filters).result.points.length,2);
 const same={...current,fetchedAt:b.collectedAt,records:[{hero:'ana',pickRate:11}]};assert.equal(withCurrentPickHistory(history,same,'ana',filters).result.points.length,2);
 const conflict={result:build([a,b,snap('20',99),snap('24',12)])};const merged=withCurrentPickHistory(conflict,same,'ana',filters);assert.equal(edges(merged.result),0);assert(merged.result.points.find(p=>p.time===Date.parse(b.collectedAt)).conflict);
});
