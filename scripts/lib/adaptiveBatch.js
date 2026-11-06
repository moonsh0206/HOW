import {collectDivisionBatch} from './divisionBatch.js';
import {adaptiveCollectionDecision} from '../../src/models/adaptiveSnapshotModel.js';
// Caller supplies local evidence and persistence; no hidden API calls or filesystem writes.
export async function collectAdaptiveRegions({service,heroKeys,patch,regions=['asia','americas','europe'],observations=[],attempts=[],now=Date.now,extraRequested=false,dryRun=true}){
 if(new Set(regions).size!==regions.length||regions.some(r=>!['asia','americas','europe'].includes(r)))throw new Error('Invalid regions');
 const results=[];
 for(const region of regions){
  const decision=adaptiveCollectionDecision({patch,observations:observations.filter(o=>o.region===region),attempts:attempts.filter(a=>a.region===region),now:now(),extraRequested});
  const result={region,decision,plannedRequests:decision.collect?9:0};
  if(!dryRun&&decision.collect){const raw=await collectDivisionBatch({service,region,heroKeys,now});raw.observationPlan={...decision,policyVersion:'patch-adaptive-v1'};result.batch=raw;}
  results.push(result);
 }
 return {dryRun,results,maxRequests:27};
}
