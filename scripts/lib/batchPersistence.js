import {open,rename,unlink,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expandSnapshotFile,stableJSON} from '../../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../../src/models/statisticsModel.js';
// Identical values/proof are conservatively redundant even if Age resets. This does not
// prove unchanged underlying matches; it only avoids retaining a duplicate observation.
export function redundantBatch(raw,previous){
 if(raw.schemaVersion!==2||previous.schemaVersion!==2||raw.region!==previous.region)return false;
 if(raw.batchId===previous.batchId)return true;
 const signature=s=>stableJSON({cohort:statisticsQuery(s.filters),records:s.records,patch:s.patch,proof:s.patchVerification,window:s.statisticsWindow});
 const old=expandSnapshotFile(previous),next=expandSnapshotFile(raw);
 return next.length>0&&next.every(s=>old.some(p=>signature(p)===signature(s)));
}
// Caller holds snapshot-collector.lock and validates the existing manifest first.
export async function persistDivisionBatch(root,raw,index,file){
 if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(file))throw new Error('Unsafe batch filename');
 const snapshots=expandSnapshotFile(raw);if(!snapshots.length)throw new Error('No original records to persist');
 for(const previousFile of new Set(index.snapshots.filter(e=>e.schemaVersion===2).map(e=>e.file))){
  if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(previousFile))throw new Error('Unsafe existing batch filename');
  if(redundantBatch(raw,JSON.parse(await readFile(join(root,previousFile),'utf8'))))throw new Error('Redundant batch/cache observation; existing records preserved');
 }
 const next={...index,snapshots:[...index.snapshots,...snapshots.map(s=>({file,schemaVersion:2,collectedAt:s.collectedAt,filters:s.filters,observationDate:raw.observationDate,reviewStatus:'pending',preserveTags:[],...(raw.observationPlan?{observationPlan:raw.observationPlan,milestones:[raw.observationPlan.milestone]}:{})}))]};
 const dataPath=join(root,file),pendingPath=join(root,`index.${process.pid}.pending`);let dataOwned=false,pendingOwned=false;
 try{
  const data=await open(dataPath,'wx');dataOwned=true;try{await data.writeFile(JSON.stringify(raw));}finally{await data.close();}
  const pending=await open(pendingPath,'wx');pendingOwned=true;try{await pending.writeFile(JSON.stringify(next,null,2)+'\n');}finally{await pending.close();}
  await rename(pendingPath,join(root,'index.json'));pendingOwned=false;dataOwned=false;
  return next;
 }finally{if(pendingOwned)await unlink(pendingPath);if(dataOwned)await unlink(dataPath);}
}
