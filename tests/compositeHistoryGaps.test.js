import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
test('composite chart cannot bridge a known failed file or incomplete original batch',async()=>{
 const originals=[14,15,16].flatMap(day=>['diamond','master','grandmaster'].map(division=>({schemaVersion:1,source:'OverFast API',aggregateAt:null,patch:null,batchId:`fixture-batch-${day}`,filters:{...DEFAULT_FILTERS,division},collectedAt:`2026-11-${day}T01:00:00.000Z`,records:[{hero:'ana',winrate:50,pickrate:day,banrate:3}]})));
 for(const failure of ['http','absent']){
  const rows=originals.filter((_,i)=>failure!=='absent'||i!==4),entries=rows.map((s,i)=>({file:`2026-11-${s.collectedAt.slice(8,10)}T01-00-0${i}Z.json`,collectedAt:s.collectedAt,filters:s.filters}));
  const service=createSnapshotService({now:()=>Date.parse('2026-11-16T03:00:00Z'),fetcher:async url=>{if(url.endsWith('index.json'))return {ok:true,json:async()=>({schemaVersion:1,snapshots:entries})};const i=entries.findIndex(e=>url.endsWith(e.file));return failure==='http'&&i===4?{ok:false,status:503}:{ok:true,json:async()=>rows[i]};}});
  const history=await service.getHistory(DEFAULT_FILTERS,{scope:'compare'});assert.equal(history.snapshots.length,2);assert(history.gaps.length);
  const graph=buildObservationTimeline([...history.snapshots,...history.gaps.map(g=>({...g,records:[]}))],'ana',DEFAULT_FILTERS,{now:Date.parse('2026-11-16T03:00:00Z')});
  assert.equal(graph.points.length,2);assert.equal(graph.segments.length,0);assert.equal(graph.comparisonSegments.length,0);
 }
});
