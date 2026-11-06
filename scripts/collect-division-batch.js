// Explicit manual command only. Does not schedule, commit, push, or delete existing files.
import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {collectDivisionBatch} from './lib/divisionBatch.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../src/models/statisticsModel.js';
import roster from '../src/data/subroles.json' with {type:'json'};
import {parseDivisionBatchOptions} from './division-batch-options.js';
import {persistDivisionBatch} from './lib/batchPersistence.js';
import {fileURLToPath} from 'node:url';
const {region,apply,retryOf}=parseDivisionBatchOptions(process.argv.slice(2));
if(!apply){console.log(`Dry-run: PC / ${region} / competitive / all maps / nine original divisions. No API or filesystem writes. Add --apply to collect manually.`);}else{
 const root=new URL('../public/data/snapshots/',import.meta.url);await mkdir(root,{recursive:true});const lockPath=new URL('snapshot-collector.lock',root),lock=await open(lockPath,'wx');
 try{
  const indexPath=new URL('index.json',root),index=JSON.parse(await readFile(indexPath,'utf8'));if(![1,2].includes(index.schemaVersion)||!Array.isArray(index.snapshots))throw new Error('Invalid index');
  const files=new Map(),seen=new Set();
  for(const e of index.snapshots){if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(e.file))throw new Error('Unsafe index path');const key=e.file+':'+statisticsQuery(e.filters);if(seen.has(key))throw new Error('Duplicate cohort index');seen.add(key);if(!files.has(e.file))files.set(e.file,JSON.parse(await readFile(new URL(e.file,root),'utf8')));if(!expandSnapshotFile(files.get(e.file)).some(s=>s.collectedAt===e.collectedAt&&statisticsQuery(s.filters)===statisticsQuery(e.filters)))throw new Error('Index/file mismatch');}
  const today=new Date().toISOString().slice(0,10);
  if(retryOf){const old=files.get(retryOf);if(!old||old.schemaVersion!==2||old.region!==region||!Object.values(old.divisions).some(d=>d.status!=='ok'))throw new Error('Recovery requires an existing partial batch in the same region');}
  if(!retryOf&&[...files.values()].some(raw=>raw.schemaVersion===2&&raw.region===region&&raw.observationDate===today)){console.log('Skipped: original region/day batch already exists; never overwritten.');}
  else{
   const raw=await collectDivisionBatch({service:createStatisticsService(),region,heroKeys:Object.keys(roster.heroes)}),snapshots=expandSnapshotFile(raw);
   if(retryOf)raw.recoveryOf=retryOf;
   if(!snapshots.length)throw new Error(`No valid division; existing data preserved: ${JSON.stringify(raw.divisions)}`);
   const file=new Date().toISOString().replaceAll(':','-')+'.json';await persistDivisionBatch(fileURLToPath(root),raw,index,file);
   console.log(`Saved ${raw.collection.status} batch: ${file}, ${snapshots.length}/9 divisions; failed: ${raw.collection.failedDivisions.join(', ')||'none'}. Pending patch review.`);
  }
 }finally{await lock.close();await unlink(lockPath);}
}
