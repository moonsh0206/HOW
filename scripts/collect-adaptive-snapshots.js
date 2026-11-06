// Explicit manual opt-in only. Default is an offline plan; no schedule/commit/push.
import {readFile,open,unlink,mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../src/models/statisticsModel.js';
import {collectAdaptiveRegions} from './lib/adaptiveBatch.js';
import {persistDivisionBatch} from './lib/batchPersistence.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const args=process.argv.slice(2),apply=args.at(-1)==='--apply';
if(args.length!==(apply?2:1)||args[0].startsWith('--'))throw new Error('Usage: node scripts/collect-adaptive-snapshots.js <local-plan.json> [--apply]');
const plan=JSON.parse(await readFile(args[0],'utf8')),patch=PATCH_CATALOG.find(p=>p.id===plan.patchId);
if(apply&&plan.now)throw new Error('A simulated clock is allowed in dry-run only');
const root=new URL('../public/data/snapshots/',import.meta.url);
async function run(){
 let index=JSON.parse(await readFile(new URL('index.json',root),'utf8'));
 if(![1,2].includes(index.schemaVersion)||!Array.isArray(index.snapshots))throw new Error('Invalid manifest');
 const files=new Map();
 for(const e of index.snapshots){if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(e.file))throw new Error('Unsafe index path');if(!files.has(e.file))files.set(e.file,JSON.parse(await readFile(new URL(e.file,root),'utf8')));const rows=expandSnapshotFile(files.get(e.file));if(!rows.some(s=>s.collectedAt===e.collectedAt&&statisticsQuery(s.filters)===statisticsQuery(e.filters)))throw new Error('Index mismatch');}
 const observations=[...files.values()].filter(r=>r.schemaVersion===2&&r.observationPlan).map(r=>({region:r.region,targetPatch:r.observationPlan.targetPatch,milestone:r.observationPlan.milestone,collectedAt:Object.values(r.divisions).filter(d=>d.status==='ok').map(d=>d.collectedAt).sort().at(-1)}));
 const ledgerPath=new URL('../node_modules/.cache/how-adaptive-attempts.json',import.meta.url);let ledger=[];
 try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));if(!Array.isArray(ledger))throw new Error('Invalid attempt ledger');}catch(error){if(error.code!=='ENOENT')throw error;}
 const options={service:apply?createStatisticsService():null,heroKeys:Object.keys(roster.heroes),patch,regions:plan.regions,observations,attempts:[...ledger,...(plan.attempts??[])],extraRequested:plan.extraRequested===true,now:()=>plan.now?Date.parse(plan.now):Date.now()};
 if(apply){const preview=await collectAdaptiveRegions(options);const attempts=preview.results.filter(e=>e.decision.collect).map(e=>({region:e.region,at:new Date().toISOString(),targetPatch:patch.id}));await mkdir(new URL('.',ledgerPath),{recursive:true});const pending=new URL('./how-adaptive-attempts.pending',ledgerPath);await writeFile(pending,JSON.stringify([...ledger,...attempts]),{flag:'wx'});await rename(pending,ledgerPath);}
 const result=await collectAdaptiveRegions({...options,dryRun:!apply});
 for(const entry of result.results)if(entry.batch){if(entry.batch.collection.status!=='complete'){entry.persistence='withheld-incomplete-batch';continue;}const file=new Date().toISOString().replaceAll(':','-')+'.json';try{index=await persistDivisionBatch(fileURLToPath(root),entry.batch,index,file);entry.persistence=file;}catch(error){entry.persistence=`not-saved: ${error.message}`;}delete entry.batch;}
 console.log(JSON.stringify(result,null,2));
}
if(!apply)await run();else{const path=new URL('snapshot-collector.lock',root),lock=await open(path,'wx');try{await run();}finally{await lock.close();await unlink(path);}}
