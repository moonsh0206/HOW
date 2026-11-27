import { statisticsQuery } from './statisticsModel.js';
import { isObservationTime } from './snapshotModel.js';
import {rateStatus} from './statisticsQuality.js';
import {validatedProvenance} from './statisticsProvenance.js';

function context(frame,heroKey,metric){return {heroKey,metric,source:frame.source,provenance:validatedProvenance(frame),statisticsWindow:frame.statisticsWindow??'unverified-patch-window',sourcePatch:frame.patch??null};}
export function historyConnection(a,b){
  const x=a.provenance,y=b.provenance;
  if(!x||!y||a.conflict||b.conflict||a.heroKey!==b.heroKey||a.metric!==b.metric||x.provider!==y.provider||x.cohort!==y.cohort||x.kind!==y.kind||x.version!==y.version||JSON.stringify(x.members)!==JSON.stringify(y.members)||a.statisticsWindow!==b.statisticsWindow)return null;
  return a.sourcePatch!==b.sourcePatch?'comparison':'observation';
}
export function connectHistoryObservations(points,observations=points){
  const byTime=new Map(points.map(point=>[point.time,point])),segments=[],comparisonSegments=[],connections=[];let previous=null;
  for(const observation of [...observations].sort((a,b)=>a.time-b.time)){
    const point=byTime.get(observation.time);
    if(!point||observation.value==null||observation.conflict){previous=null;continue;}
    const kind=previous&&historyConnection(previous,point);
    if(kind){const pair=[previous,point];(kind==='comparison'?comparisonSegments:segments).push(pair);connections.push({from:previous.time,to:point.time,kind:'observation-guide',patchBoundary:previous.sourcePatch!==point.sourcePatch,aggregationWindowComparable:previous.statisticsWindow!=='unverified-patch-window'&&kind!=='comparison'});}
    previous=point;
  }
  return {segments,comparisonSegments,connections};
}

// The current response is an observation at its original HOW fetch time, never "now".
export const HISTORY_METRICS = Object.freeze(['winRate','pickRate','banRate']);
export function withCurrentPickHistory(history, statistics, heroKey, filters, metric = 'pickRate') {
  if (!HISTORY_METRICS.includes(metric)) throw new Error('Invalid history metric');
  const base = history.result ?? { points: [], segments: [], warnings: [] };
  const result = { ...base, points: [...base.points], segments: [...base.segments] };
  const complete = value => ['platform','gamemode','region','division','map'].every(key => typeof value?.[key] === 'string');
  if (!complete(statistics?.filters) || !complete(filters) || statisticsQuery(statistics.filters) !== statisticsQuery(filters) || !isObservationTime(statistics.fetchedAt)) return { ...history, result };
  const rows = statistics.records?.filter(row => row.hero === heroKey) ?? [];
  const pickRate = rows.length === 1 && rateStatus(rows[0],metric)==='available' ? rows[0][metric] : null;
  if (!Number.isFinite(pickRate) || pickRate < 0 || pickRate > 100) return { ...history, result };
  const current = { ...context(statistics,heroKey,metric),collectedAt: statistics.fetchedAt, time: Date.parse(statistics.fetchedAt), [metric]: pickRate, value: pickRate, patch: null, current: true, stored:false,verificationStatus:'unverified', stale: statistics.stale === true, cached: statistics.cached, providerAgeSeconds: statistics.providerAgeSeconds ?? null,composite:statistics.composite===true,observationStart:statistics.observationStart??null };
  const same = result.points.findIndex(point => point.time === current.time);
  if (same < 0) {
    const marker=base.observations?.find(point=>point.time===current.time);
    result.points.push(marker?.conflict||marker?.value===null?{...current,conflict:true,storedObservation:marker}:current);
  }
  else if ((result.points[same].value??result.points[same][metric]) === pickRate&&historyConnection(result.points[same],current)) {const old=result.points[same];result.points[same] = { ...old, ...current, patch: old.patch,sourcePatch:old.sourcePatch,stored:old.stored===true,verificationStatus:old.verificationStatus??'unverified' };}
  // A conflicting archive observation at the exact same instant is not drawn twice.
  else result.points.splice(same, 1, {...current,conflict:true,storedObservation:result.points[same]});
  result.points.sort((a,b) => a.time - b.time);
  const observations=[...(result.observations??base.points).filter(p=>p.time!==current.time),result.points.find(p=>p.time===current.time)].sort((a,b)=>a.time-b.time);
  result.observations=observations;Object.assign(result,connectHistoryObservations(result.points,observations));
  return { ...history, result, current };
}

// Lines guide between actual compatible observations; elapsed days are not missing data.
export function buildPickHistory(snapshots, heroKey, filters, { days = 7, now = Date.now(), metric = 'pickRate', all = false } = {}) {
  if (!HISTORY_METRICS.includes(metric)) throw new Error('Invalid history metric');
  if (![7,30].includes(days) || !Number.isFinite(now) || !Array.isArray(snapshots)) throw new Error('지원하지 않는 이력 기간 또는 기준 시각입니다.');
  const query = statisticsQuery(filters), start = all ? -Infinity : now - days * 86400000, byTime = new Map(), warnings = [];
  for (const snapshot of snapshots) {
    try {
      if (!isObservationTime(snapshot.collectedAt)) throw new Error('잘못된 관측 시각');
      if (!['platform','gamemode','region','division','map'].every(key => typeof snapshot.filters?.[key] === 'string') || statisticsQuery(snapshot.filters) !== query) continue;
      const time = Date.parse(snapshot.collectedAt); if (time < start || time > now) continue;
      const rows = snapshot.records?.filter(row => row.hero === heroKey) ?? [];
      const value = rows.length === 1 && rateStatus(rows[0],metric)==='available' ? rows[0][metric] : null;
      const valid = Number.isFinite(value) && value >= 0 && value <= 100;
      const point = { ...context(snapshot,heroKey,metric),collectedAt: snapshot.collectedAt, time, [metric]: valid ? value : null, value: valid ? value : null, patch: snapshot.patch ?? null,...(snapshot.composite?{composite:true,observationStart:snapshot.observationStart}: {}) };
      const prior = byTime.get(time);
      if (prior && (prior[metric] !== point[metric] || prior.patch !== point.patch||JSON.stringify(prior.provenance)!==JSON.stringify(point.provenance)||prior.statisticsWindow!==point.statisticsWindow)) {
        byTime.set(time, { ...point, [metric]: null, value: null, conflict: true }); warnings.push('같은 시각의 상충 관측을 제외했습니다.');
      } else if (!prior) byTime.set(time, point);
    } catch (error) { warnings.push(error.message); }
  }
  const observations=[...byTime.values()].sort((a,b)=>a.time-b.time),points=observations.filter(point=>point[metric]!=null&&!point.conflict);
  return { points,...connectHistoryObservations(points,observations),warnings, days, metric, observations,filters: { ...filters } };
}

export const buildMetricHistory = buildPickHistory;
export const withCurrentMetricHistory = withCurrentPickHistory;
