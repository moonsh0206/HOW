import {divisionMembers,statisticsQuery} from './statisticsModel.js';
import {combineDivisionStatistics} from './compositeStatisticsModel.js';
import {verifiedPatch} from './patchHistoryModel.js';

// A composite history point may be derived only from a complete same-cohort observation:
// (1) a verified common patch/window near in time, or
// (2) all required originals in one explicit unverified collection batch.
// Unverified batches NEVER gain a patch ID or a "since patch" window by inference.
export function combineDivisionHistory(snapshots,filters,{toleranceMs=300000,batchToleranceMs=1800000,catalog}={}){
 const members=divisionMembers(filters.division),used=new Set(),result=[];
 const rows=snapshots.filter(s=>members.includes(s.filters?.division)&&statisticsQuery(s.filters)===statisticsQuery({...filters,division:s.filters.division})).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
 for(const anchor of rows.filter(s=>s.filters.division===members[0])){
  const patch=verifiedPatch(anchor,catalog);
  const sameBatch=!patch&&anchor.patch==null&&typeof anchor.batchId==='string'&&anchor.batchId.length>0&&anchor.statisticsWindow==='unverified-patch-window';
  if(!patch&&!sameBatch)continue;
  const allowedGap=patch?toleranceMs:batchToleranceMs;
  const group=members.map(division=>rows.find(s=>{
   if(used.has(s)||s.filters.division!==division||Math.abs(Date.parse(s.collectedAt)-Date.parse(anchor.collectedAt))>allowedGap)return false;
   if(patch)return verifiedPatch(s,catalog)?.id===patch.id&&s.statisticsWindow===anchor.statisticsWindow&&s.statisticsWindow==='since-patch-start'&&(!anchor.batchId||s.batchId===anchor.batchId);
   return s.patch==null&&s.statisticsWindow==='unverified-patch-window'&&s.batchId===anchor.batchId;
  }));
  if(group.some(s=>!s))continue;
  const times=group.map(s=>Date.parse(s.collectedAt));if(Math.max(...times)-Math.min(...times)>allowedGap)continue;
  group.forEach(s=>used.add(s));
  result.push({source:'OverFast API',filters:{...filters},collectedAt:new Date(Math.max(...times)).toISOString(),observationStart:new Date(Math.min(...times)).toISOString(),aggregateAt:null,patch:patch?.id??null,patchVerification:patch?anchor.patchVerification:{status:'unverified'},statisticsWindow:patch?'since-patch-start':'unverified-patch-window',batchId:anchor.batchId??null,composite:true,components:group.map(s=>({division:s.filters.division,collectedAt:s.collectedAt})),records:combineDivisionStatistics(filters,group)});
 }
 return result;
}
