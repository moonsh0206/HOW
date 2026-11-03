import { statisticsQuery } from './statisticsModel.js';
import { verifiedPatch, representatives } from './patchHistoryModel.js';

// A proposal only: unknown patches and the HOT comparison window are always protected.
export function retentionPlan(entries, {now=Date.now(),currentPatch=null,catalog}={}) {
  const keep=new Set(),groups=new Map();
  for(const entry of entries){
    if(!currentPatch||!verifiedPatch(entry.snapshot,catalog)||entry.snapshot.patch===currentPatch||now-Date.parse(entry.snapshot.collectedAt)<=7*86400000){keep.add(entry.file);continue;}
    const key=`${statisticsQuery(entry.snapshot.filters)}:${entry.snapshot.patch}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);
  }
  for(const group of groups.values()) for(const s of representatives(group.map(e=>({...e.snapshot,file:e.file}))))keep.add(s.file);
  return {dryRun:true,keep:entries.filter(e=>keep.has(e.file)).map(e=>e.file),candidates:entries.filter(e=>!keep.has(e.file)).map(e=>e.file)};
}
