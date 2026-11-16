import {readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readGraphBundle} from './graphArchive.js';
import {collectAdaptiveRegions} from './adaptiveBatch.js';
import {persistDivisionBatch} from './batchPersistence.js';
import {assertGraphRoster} from './divisionBatch.js';

async function writeLedger(path,ledger){
 await mkdir(dirname(path),{recursive:true});const pending=`${path}.${randomUUID()}.pending`;
 await writeFile(pending,JSON.stringify(ledger)+'\n',{flag:'wx'});
 try{await rename(pending,path);}finally{await unlink(pending).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
// Caller owns the collector lock. Only complete original batches are appended.
// The result is diagnostics only and never contains source rates.
export async function collectGraphObservations({root,ledgerPath,plan={},patch,heroKeys,heroesService,service,now=Date.now,dryRun=true}){
 if(!dryRun&&plan.now)throw Error('A simulated clock is allowed in dry-run only');
 const bundle=await readGraphBundle(root),observations=[];
 for(const bytes of bundle.files.values()){
  const raw=JSON.parse(bytes);
  if(raw.schemaVersion!==2||Object.values(raw.divisions).filter(d=>d.status==='ok').length!==9)continue;
  observations.push({region:raw.region,targetPatch:raw.observationPlan?.targetPatch??null,milestone:raw.observationPlan?.milestone??'ordinary-weekly',collectedAt:Object.values(raw.divisions).map(d=>d.collectedAt).sort().at(-1)});
 }
 let ledger=[];try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));if(!Array.isArray(ledger))throw Error('Invalid attempt ledger');}catch(error){if(error.code!=='ENOENT')throw error;}
 const options={service,heroKeys,patch,regions:plan.regions,observations,attempts:[...ledger,...(plan.attempts??[])],extraRequested:plan.extraRequested===true,now};
 const preview=await collectAdaptiveRegions(options);if(dryRun)return preview;
 const at=new Date(now()).toISOString(),planned=preview.results.filter(r=>r.decision.collect).map(r=>({region:r.region,at,targetPatch:r.decision.targetPatch??null}));
 // Before network/roster validation, so early failures also consume a bounded attempt.
 ledger.push(...planned);await writeLedger(ledgerPath,ledger);
 if(planned.length){const {heroes}=await heroesService.getHeroes();assertGraphRoster(heroKeys,heroes);}
 const run=await collectAdaptiveRegions({...options,dryRun:false});
 let index=bundle.index,updated=0,failures=0;const results=[];
 for(const entry of run.results){
  const {batch,...summary}=entry;if(!batch){results.push(summary);continue;}
  summary.collection=batch.collection;
  const failed=batch.collection.failedDivisions.map(d=>batch.divisions[d]);
  summary.errors=failed.map(d=>({error:d.error,retryAt:d.retryAt??null}));
  const retryAt=failed.map(d=>d.retryAt).filter(Boolean).sort().at(-1);
  const attempt=planned.find(a=>a.region===entry.region);if(retryAt&&attempt)attempt.retryAt=retryAt;
  if(batch.collection.status!=='complete'){summary.persistence='withheld-incomplete-batch';failures++;results.push(summary);continue;}
  const base=new Date(now()).toISOString().replaceAll(':','-'),used=new Set(index.snapshots.map(e=>e.file));let file=base+'.json',suffix=1;
  while(used.has(file))file=`${base}-${suffix++}.json`;
  try{index=await persistDivisionBatch(root,batch,index,file);summary.persistence=file;updated++;}
  catch(error){summary.persistence=error.code==='DUPLICATE_OBSERVATION'?'already-preserved':'not-saved';summary.error=error.message;if(error.code!=='DUPLICATE_OBSERVATION')failures++;}
  results.push(summary);
 }
 await writeLedger(ledgerPath,ledger);
 return {dryRun:false,updated,failures,status:failures?'failed':updated?'collected':'unchanged',results,maxStatisticsRequests:27};
}
