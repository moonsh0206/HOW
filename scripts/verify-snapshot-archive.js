// Offline audit of real files: never fetches OverFast, writes snapshots, or invents history.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {expandSnapshotFile,DERIVED_DIVISIONS} from '../src/models/snapshotV2Model.js';
import {DIVISIONS,DEFAULT_FILTERS,divisionMembers,statisticsQuery} from '../src/models/statisticsModel.js';
import {RATE_FIELDS,rateStatus,qualitySummary} from '../src/models/statisticsQuality.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {withCurrentMetricHistory} from '../src/models/pickHistoryModel.js';
import {renderMetricHistory} from '../src/views/pickHistoryView.js';
import {hotHeroes} from '../src/domain/insights.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const root=new URL('../public/data/snapshots/',import.meta.url);
const read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const index=await read('index.json'),files=new Map(),seen=new Set();
for(const entry of index.snapshots){
 assert(/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file));
 if(!files.has(entry.file))files.set(entry.file,{raw:await read(entry.file)});
 const item=files.get(entry.file);item.frames??=expandSnapshotFile(item.raw,{includeDerived:true});
 assert(item.frames.some(f=>f.collectedAt===entry.collectedAt&&statisticsQuery(f.filters)===statisticsQuery(entry.filters)));
 const key=`${entry.file}:${statisticsQuery(entry.filters)}`;assert(!seen.has(key),'duplicate index cohort');seen.add(key);
}
let baseline=null;
if(process.argv[2]){
 const base=pathToFileURL(resolve(process.argv[2])+'/'),hashes=JSON.parse(await readFile(new URL('protected-hashes.json',base),'utf8'));
 const before=JSON.parse(await readFile(new URL('index.json',base),'utf8'));
 for(const [file,hash]of Object.entries(hashes))if(file!=='index.json')assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,`original changed: ${file}`);
 for(const entry of before.snapshots)assert(index.snapshots.some(e=>JSON.stringify(e)===JSON.stringify(entry)),'prior index entry altered');
 baseline={originalFilesUnchanged:true,originalIndexEntriesPreserved:true,priorIndexItems:before.snapshots.length,addedIndexItems:index.snapshots.length-before.snapshots.length};
}
const report={auditedAt:new Date().toISOString(),defaultDivision:DEFAULT_FILTERS.division,indexItems:index.snapshots.length,files:files.size,baseline,batches:[],history:[]};
assert.equal(DEFAULT_FILTERS.division,'diamond_plus');
for(const [file,{raw,frames}]of files){
 if(raw.schemaVersion!==2)continue;
 assert.equal(raw.heroes.length,54);assert.equal(new Set(raw.heroes).size,54);assert.equal(Object.keys(raw.divisions).length,9);assert.equal(Object.keys(raw.derived).length,7);
 const originals=frames.filter(f=>!f.composite),derived=frames.filter(f=>f.composite);
 let compared=0;
 for(const frame of derived)for(const row of frame.records)for(const field of RATE_FIELDS){
  const components=divisionMembers(frame.filters.division).map(d=>originals.find(o=>o.filters.division===d)?.records.find(r=>r.hero===row.hero));
  const expected=components.every(c=>rateStatus(c,field)==='available')?components.reduce((sum,c)=>sum+c[field],0)/components.length:null;
  if(expected===null)assert.equal(row[field],null);else assert(Math.abs(row[field]-expected)<1e-10,'derived arithmetic mismatch');compared++;
 }
 report.batches.push({file,region:raw.region,batchId:raw.batchId,status:raw.collection.status,originals:originals.length,derived:derived.length,heroes:raw.heroes.length,independentlyComparedValues:compared,divisions:Object.fromEntries(Object.entries(raw.divisions).map(([d,v])=>[d,{status:v.status,collectedAt:v.collectedAt,cacheAgeSeconds:v.cacheAgeSeconds,requestUrl:v.requestUrl,patch:v.patch,patchVerification:v.patchVerification,quality:v.qualitySummary,nullValues:v.records?.flat().filter(v=>v===null).length??null}])),derivedQuality:Object.fromEntries(derived.map(f=>[f.filters.division,qualitySummary(f.records)]))});
}
const now=Math.max(...index.snapshots.map(e=>Date.parse(e.collectedAt)))+1000,reads=[];
const service=createSnapshotService({base:'/HOW/',now:()=>now,fetcher:async url=>{
 assert(url.startsWith('/HOW/data/snapshots/'));const file=url.slice('/HOW/data/snapshots/'.length);assert(file==='index.json'||files.has(file));reads.push(file);return {ok:true,json:()=>read(file)};
}});
const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
try{
 for(const batch of report.batches){
  const {frames}=files.get(batch.file);
  for(const division of [...Object.keys(DIVISIONS),...DERIVED_DIVISIONS]){
   const frame=frames.find(f=>f.filters.division===division);if(!frame)continue;
   const history=await service.getHistory(frame.filters,{scope:'compare'});assert(!history.warnings.length);assert(history.snapshots.some(s=>s.batchId===batch.batchId));
   assert(history.snapshots.every(s=>statisticsQuery(s.filters)===statisticsQuery(frame.filters)));
   const metricPoints={};
   for(const metric of RATE_FIELDS){
    const result=buildObservationTimeline(history.snapshots,'genji',frame.filters,{metric,now});
    const row=frame.records.find(r=>r.hero==='genji');
    if(rateStatus(row,metric)==='available')assert(result.points.some(p=>p.time===Date.parse(frame.collectedAt)&&p.value===row[metric]));
    assert(result.points.every(p=>p.stored===true&&p.verificationStatus==='unverified'&&!p.representative));
    const panel=renderMetricHistory({status:'ready',metric,result});assert.equal(panel.querySelectorAll('.history-point').length,result.points.length);
    const mixed=withCurrentMetricHistory({status:'ready',metric,result},{...frame,fetchedAt:frame.collectedAt},'genji',frame.filters,metric);
    if(mixed.current){assert.equal(mixed.current.stored,false);assert.equal(mixed.result.points.length,result.points.length);}
    metricPoints[metric]={points:result.points.length,values:result.points.map(p=>({at:p.collectedAt,value:p.value})),storedChange:result.storedChange};
   }
   const heroes=frame.records.map(statistics=>({key:statistics.hero,role:roster.heroes[statistics.hero]?.parentRole,statistics}));
   const previous=await service.getPrevious(frame.filters,frame.collectedAt),hot=hotHeroes(heroes, {...frame,fetchedAt:frame.collectedAt},previous);
   report.history.push({region:batch.region,division,snapshots:history.snapshots.length,metricPoints,previousAt:previous?.collectedAt??null,hotComparisonAvailable:hot.available,hotReason:hot.reason,hotHeroes:hot.heroes.map(h=>({key:h.key,pickDelta:h.pickDelta,winDelta:h.winDelta}))});
  }
 }
}finally{globalThis.document=prior;dom.window.close();}
report.localFileReads=reads;console.log(JSON.stringify(report,null,2));
