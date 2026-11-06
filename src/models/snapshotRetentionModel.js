import { statisticsQuery } from './statisticsModel.js';
import { verifiedPatch, representatives } from './patchHistoryModel.js';
import { patchCollectionDue } from './patchCollectionModel.js';

// A proposal only: unknown patches and the HOT comparison window are always protected.
export function retentionPlan(entries, {now=Date.now(),currentPatch=null,catalog}={}) {
  const keep=new Set(),groups=new Map();
  for(const entry of entries){
    if(entry.snapshot.schemaVersion===1||entry.preserveTags?.length||entry.milestones?.length||!currentPatch||!verifiedPatch(entry.snapshot,catalog)||entry.snapshot.patch===currentPatch||now-Date.parse(entry.snapshot.collectedAt)<=14*86400000){keep.add(entry.file);continue;}
    const key=`${statisticsQuery(entry.snapshot.filters)}:${entry.snapshot.patch}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);
  }
  for(const group of groups.values()) {
    const observations=group.map(e=>({...e.snapshot,file:e.file})).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
    const due=patchCollectionDue(verifiedPatch(observations[0],catalog));
    const first=observations.find(s=>s.representativeKind==='first-confirmed-after-day-one')??observations.find(s=>due!==null&&Date.parse(s.collectedAt)>=due);
    if(first)keep.add(first.file);
    for(const s of representatives(observations).slice(-1))keep.add(s.file);
  }
  return {dryRun:true,keep:entries.filter(e=>keep.has(e.file)).map(e=>e.file),candidates:entries.filter(e=>!keep.has(e.file)).map(e=>e.file)};
}
