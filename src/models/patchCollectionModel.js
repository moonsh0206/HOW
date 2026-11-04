import { isObservationTime } from './snapshotModel.js';
const kstDate=time=>new Date(time+9*3600000).toISOString().slice(0,10);
// Follow-up planning only; this does not activate collection or replace the first representative.
export function patchMilestones(patch){const first=patchCollectionDue(patch);if(first===null)return [];return [1,3,7].map(day=>({day,notBefore:new Date(Date.parse(patch.effectiveAt)+day*86400000).toISOString(),kind:day===1?'first-confirmed-after-day-one':`follow-up-day-${day}`}));}
export function patchCollectionDue(patch) {
  if(!isObservationTime(patch?.effectiveAt)||!['balance','hero-hotfix','hotfix'].includes(patch.type))return null;
  const applied=Date.parse(patch.effectiveAt),nextDay=Date.parse(`${kstDate(applied)}T00:00:00+09:00`)+86400000;
  return Math.max(applied+86400000,nextDay);
}
export function collectionDecision(patch,entries,filters,query,now=Date.now()) {
  const due=patchCollectionDue(patch);
  if(due==null)return {collect:false,reason:'application-time-unverified'};
  if(now<due)return {collect:false,reason:'before-day-one',dueAt:new Date(due).toISOString()};
  const same=entries.filter(e=>e.targetPatch===patch.id&&query(e.filters)===query(filters));
  if(same.some(e=>e.representativeKind==='first-confirmed-after-day-one'))return {collect:false,reason:'representative-already-preserved'};
  if(same.some(e=>now-Date.parse(e.collectedAt)<86400000))return {collect:false,reason:'daily-retry-limit'};
  return {collect:true,dueAt:new Date(due).toISOString()};
}
