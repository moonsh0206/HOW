import {divisionMembers,statisticsQuery} from './statisticsModel.js';
import {combineDivisionStatistics} from './compositeStatisticsModel.js';
import {verifiedPatch} from './patchHistoryModel.js';
// In-memory derived data only. No cross-day matching and no inferred patch window.
export function combineDivisionHistory(snapshots,filters,{toleranceMs=300000,catalog}={}){
 const members=divisionMembers(filters.division),used=new Set(),result=[];
 const rows=snapshots.filter(s=>members.includes(s.filters?.division)&&statisticsQuery(s.filters)===statisticsQuery({...filters,division:s.filters.division})).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
 for(const anchor of rows.filter(s=>s.filters.division===members[0])){
  const patch=verifiedPatch(anchor,catalog);if(!patch)continue;
  const group=members.map(division=>rows.find(s=>!used.has(s)&&s.filters.division===division&&verifiedPatch(s,catalog)?.id===patch.id&&s.statisticsWindow===anchor.statisticsWindow&&s.statisticsWindow==='since-patch-start'&&Math.abs(Date.parse(s.collectedAt)-Date.parse(anchor.collectedAt))<=toleranceMs&&(!anchor.batchId||s.batchId===anchor.batchId)));
  if(group.some(s=>!s))continue;
  const times=group.map(s=>Date.parse(s.collectedAt));if(Math.max(...times)-Math.min(...times)>toleranceMs)continue;
  group.forEach(s=>used.add(s));
  result.push({source:'OverFast API',filters:{...filters},collectedAt:new Date(Math.max(...times)).toISOString(),observationStart:new Date(Math.min(...times)).toISOString(),aggregateAt:null,patch:patch.id,patchVerification:anchor.patchVerification,statisticsWindow:anchor.statisticsWindow,composite:true,components:group.map(s=>({division:s.filters.division,collectedAt:s.collectedAt})),records:combineDivisionStatistics(filters,group)});
 }
 return result;
}
