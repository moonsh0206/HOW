import {divisionMembers,statisticsQuery,isCompositeDivision} from './statisticsModel.js';
import {combineDivisionStatistics} from './compositeStatisticsModel.js';
import {verifiedPatch} from './patchHistoryModel.js';
import {isObservationTime} from './snapshotModel.js';
import {DERIVATION_VERSION,derivedProvenance,validatedProvenance} from './statisticsProvenance.js';
// A batch is an actual collection boundary, not a date bucket or inferred patch.
export function combineDivisionHistory(snapshots,filters,{toleranceMs=300000,catalog}={}){
 if(!isCompositeDivision(filters.division))throw new Error('Original divisions must use original history');
 if(!Number.isFinite(toleranceMs)||toleranceMs<0)throw new Error('Invalid observation tolerance');
 const members=divisionMembers(filters.division),groups=new Map(),result=[];
 for(const s of snapshots){
  try{
   if(typeof s.batchId!=='string'||!s.batchId||!isObservationTime(s.collectedAt)||!members.includes(s.filters?.division)||statisticsQuery(s.filters)!==statisticsQuery({...filters,division:s.filters.division})||!validatedProvenance(s)||(s.derivationVersion&&s.derivationVersion!==DERIVATION_VERSION))continue;
   if(!groups.has(s.batchId))groups.set(s.batchId,[]);groups.get(s.batchId).push(s);
  }catch{continue;}
 }
 for(const [batchId,rows] of groups){
  if(members.some(d=>rows.filter(s=>s.filters.division===d).length!==1))continue;
  const group=members.map(d=>rows.find(s=>s.filters.division===d)),times=group.map(s=>Date.parse(s.collectedAt));
  if(Math.max(...times)-Math.min(...times)>toleranceMs)continue;
  const days=group.map(s=>s.observationDate).filter(Boolean);if(new Set(days).size>1)continue;
  const windows=group.map(s=>s.statisticsWindow??'unverified-patch-window');
  if(new Set(windows).size!==1)continue;
  const patches=group.map(s=>verifiedPatch(s,catalog)),verified=patches.every(p=>p&&p.id===patches[0]?.id);
  if(patches.some(Boolean)&&!verified||new Set(group.map(s=>s.patch??null)).size!==1)continue;
  if(!verified&&windows[0]==='since-patch-start')continue;
  result.push({rankPolicyId:group.every(s=>s.rankPolicyId===group[0].rankPolicyId)?group[0].rankPolicyId:undefined,rankRoster:group.every(s=>JSON.stringify(s.rankRoster)===JSON.stringify(group[0].rankRoster))?group[0].rankRoster:undefined,source:'HOW derived statistics',filters:{...filters},batchId,observationDate:days[0]??group[0].collectedAt.slice(0,10),collectedAt:new Date(Math.max(...times)).toISOString(),observationStart:new Date(Math.min(...times)).toISOString(),aggregateAt:null,patch:verified?patches[0].id:null,patchVerification:verified?group[0].patchVerification:{status:'unverified'},statisticsWindow:windows[0],composite:true,provenance:derivedProvenance(filters),components:group.map(s=>({division:s.filters.division,collectedAt:s.collectedAt})),records:combineDivisionStatistics(filters,group)});
 }
 return result.sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
}
