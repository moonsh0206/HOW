import {isObservationTime} from './snapshotModel.js';
import {statisticsQuery} from './statisticsModel.js';
import {verifiedPatch} from './patchHistoryModel.js';
// Select real files, never copy or average values. Unknown attribution stays pending.
export function preservationTags(observations,catalog){
 const result=new Map();
 const tag=(row,value)=>{if(!result.has(row.file))result.set(row.file,new Set());result.get(row.file).add(value);};
 const groups=new Map();
 for(const row of observations){if(!isObservationTime(row.snapshot?.collectedAt))continue;const key=statisticsQuery(row.snapshot.filters);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const patches=catalog.filter(p=>isObservationTime(p.effectiveAt)&&['balance','hotfix','hero-hotfix'].includes(p.type)).sort((a,b)=>Date.parse(a.effectiveAt)-Date.parse(b.effectiveAt));
 for(const rows of groups.values()){
  rows.sort((a,b)=>Date.parse(a.snapshot.collectedAt)-Date.parse(b.snapshot.collectedAt));
  for(let i=0;i<patches.length;i++){
   const patch=patches[i],start=Date.parse(patch.effectiveAt),end=i+1<patches.length?Date.parse(patches[i+1].effectiveAt):Infinity;
   const before=rows.filter(r=>Date.parse(r.snapshot.collectedAt)<start&&verifiedPatch(r.snapshot,catalog));
   if(before.length)tag(before.at(-1),`${patch.id}:pre-patch`);
   for(const day of [1,3,7]){const candidate=rows.find(r=>Date.parse(r.snapshot.collectedAt)>=start+day*86400000&&Date.parse(r.snapshot.collectedAt)<end&&verifiedPatch(r.snapshot,catalog)?.id===patch.id);if(candidate)tag(candidate,`${patch.id}:D+${day}`);}
  }
 }
 return Object.fromEntries([...result].map(([file,tags])=>[file,[...tags]]));
}
// Non-destructive plan. v1, pending review, milestones and explicit tags are protected.
export function archiveRetentionPlan(entries,{now=Date.now(),days=14}={}){
 if(!Number.isInteger(days)||days<1)throw new Error('Invalid retention period');
 const keep=[],candidates=[];
 for(const entry of entries){const age=now-Date.parse(entry.observationDate??entry.collectedAt);const protect=entry.schemaVersion!==2||!Number.isFinite(age)||age<0||age<=days*86400000||entry.reviewStatus!=='complete'||entry.preserveTags?.length||entry.milestones?.length;(protect?keep:candidates).push(entry.file);}
 return {dryRun:true,days,keep:[...new Set(keep)],candidates:[...new Set(candidates)].filter(f=>!keep.includes(f))};
}
