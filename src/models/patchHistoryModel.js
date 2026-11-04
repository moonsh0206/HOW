import { PATCH_CATALOG } from '../data/patchCatalog.js';
import { buildMetricHistory } from './pickHistoryModel.js';
import { isObservationTime } from './snapshotModel.js';
import { patchCollectionDue } from './patchCollectionModel.js';

export function verifiedPatch(snapshot, catalog = PATCH_CATALOG) {
  const proof = snapshot.patchVerification;
  const patch = catalog.find(item => item.id === snapshot.patch);
  if (!patch || proof?.status !== 'verified' || proof.catalogId !== patch.id || proof.sourceUrl !== patch.sourceUrl || proof.statisticsWindow !== 'since-patch-start' || !isObservationTime(proof.verifiedAt)) return null;
  return patch;
}
export function representatives(snapshots) {
  return [...new Map([...snapshots].sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt)).map(s=>[s.collectedAt,s])).values()].slice(-2);
}
// Preserve the first verified observation after day one, rather than replacing it later.
export function buildPatchTimeline(snapshots, heroKey, filters, {metric='pickRate',currentPatch=null,catalog=PATCH_CATALOG,now=Date.now()}={}) {
  const verified=snapshots.filter(s=>{const patch=verifiedPatch(s,catalog),due=patchCollectionDue(patch);return due!==null&&Date.parse(s.collectedAt)>=due;});
  const checked=buildMetricHistory(verified,heroKey,filters,{metric,now,all:true});
  const byPatch=new Map();
  for(const point of checked.points) if(!byPatch.has(point.patch))byPatch.set(point.patch,point);
  const points=[...byPatch.values()].map(point=>{
    const patch=catalog.find(row=>row.id===point.patch);
    return {...point,patchLabel:patch.name??patch.version??patch.date??patch.id,ongoing:point.patch===currentPatch,verificationStatus:'verified'};
  });
  return {...checked,points,segments:[],comparisonWindow:'different-patch-windows',representativePolicy:'first-confirmed-after-day-one',patchCount:points.length};
}
export function buildPatchHistory(snapshots, heroKey, filters, { metric='pickRate', mode='patch', currentPatch=null, catalog=PATCH_CATALOG, now=Date.now(), releasedAt=null } = {}) {
  if (!['patch','compare'].includes(mode)) throw new Error('Invalid patch view');
  const eligible = snapshots.filter(s=>verifiedPatch(s,catalog) && isObservationTime(s.collectedAt) && (!releasedAt || isObservationTime(releasedAt) && Date.parse(s.collectedAt)>=Date.parse(releasedAt)));
  const groups = new Map();
  for (const s of eligible) {
    // Reuse complete-cohort, hero/value/date validation without imposing a 30-day cutoff.
    const checked=buildMetricHistory([s],heroKey,filters,{metric,now:Date.parse(s.collectedAt),days:7});
    if (!checked.points.length || Date.parse(s.collectedAt)>now) continue;
    if (!groups.has(s.patch)) groups.set(s.patch,[]); groups.get(s.patch).push(s);
  }
  const selected = mode==='patch' ? eligible.filter(s=>s.patch===currentPatch) : groups.size>=2 ? [...groups.values()].flatMap(representatives) : [];
  const result = buildMetricHistory(selected,heroKey,filters,{metric,now,all:true});
  if(mode==='compare') result.segments=[];
  return {...result,mode,comparisonWindow:mode==='compare'?'different-patch-windows':'within-verified-patch',patchCount:groups.size};
}
