// Explicit manual command only. Does not schedule, commit, push, or delete existing files.
import {readFile,writeFile,mkdir,open,rename,unlink} from 'node:fs/promises';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {collectDivisionBatch} from './lib/divisionBatch.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {REGIONS,statisticsQuery} from '../src/models/statisticsModel.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const args=process.argv.slice(2),apply=args.includes('--apply'),rest=args.filter(a=>a!=='--apply');
if(rest.length!==0&&(rest.length!==2||rest[0]!=='--region'))throw new Error('Usage: node scripts/collect-division-batch.js [--region asia|europe|americas] [--apply]');
const region=rest[1]??'asia';if(!Object.hasOwn(REGIONS,region))throw new Error('Invalid region');
if(!apply){console.log(`Dry-run: PC / ${region} / competitive / all maps / nine original divisions. No API or filesystem writes. Add --apply to collect manually.`);}else{
 const root=new URL('../public/data/snapshots/',import.meta.url);await mkdir(root,{recursive:true});const lockPath=new URL('snapshot-collector.lock',root),lock=await open(lockPath,'wx');let written,pending;
 try{
  const indexPath=new URL('index.json',root),index=JSON.parse(await readFile(indexPath,'utf8'));if(![1,2].includes(index.schemaVersion)||!Array.isArray(index.snapshots))throw new Error('Invalid index');
  const files=new Map(),seen=new Set();
  for(const e of index.snapshots){if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(e.file))throw new Error('Unsafe index path');const key=e.file+':'+statisticsQuery(e.filters);if(seen.has(key))throw new Error('Duplicate cohort index');seen.add(key);if(!files.has(e.file))files.set(e.file,JSON.parse(await readFile(new URL(e.file,root),'utf8')));if(!expandSnapshotFile(files.get(e.file)).some(s=>s.collectedAt===e.collectedAt&&statisticsQuery(s.filters)===statisticsQuery(e.filters)))throw new Error('Index/file mismatch');}
  const today=new Date().toISOString().slice(0,10);
  if([...files.values()].some(raw=>raw.schemaVersion===2&&raw.region===region&&raw.observationDate===today)){console.log('Skipped: original region/day batch already exists; never overwritten.');}
  else{
   const raw=await collectDivisionBatch({service:createStatisticsService(),region,heroKeys:Object.keys(roster.heroes)}),snapshots=expandSnapshotFile(raw);
   if(snapshots.length!==Object.keys(raw.divisions).length)throw new Error(`Incomplete batch (${snapshots.length}/9); do not store a partial tier history. Retry later.`);
   const file=new Date().toISOString().replaceAll(':','-')+'.json';written=new URL(file,root);await writeFile(written,JSON.stringify(raw),{flag:'wx'});
   index.snapshots.push(...snapshots.map(s=>({file,schemaVersion:2,collectedAt:s.collectedAt,filters:s.filters,observationDate:raw.observationDate,reviewStatus:'pending',preserveTags:[]})));
   pending=new URL(`index.${process.pid}.pending`,root);await writeFile(pending,JSON.stringify(index,null,2)+'\n',{flag:'wx'});await rename(pending,indexPath);pending=null;written=null;console.log(`Saved original batch: ${file}, ${snapshots.length}/9 divisions. Pending patch review.`);
  }
 }finally{if(pending)await unlink(pending).catch(()=>{});if(written)await unlink(written).catch(()=>{});await lock.close();await unlink(lockPath);}
}
