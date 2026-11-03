import { statisticsQuery } from './statisticsModel.js';
import { isObservationTime } from './snapshotModel.js';

// The current response is an observation at its original HOW fetch time, never "now".
export const HISTORY_METRICS = Object.freeze(['winRate','pickRate','banRate']);
export function withCurrentPickHistory(history, statistics, heroKey, filters, metric = 'pickRate') {
  if (!HISTORY_METRICS.includes(metric)) throw new Error('Invalid history metric');
  const base = history.result ?? { points: [], segments: [], warnings: [] };
  const result = { ...base, points: [...base.points], segments: [...base.segments] };
  const complete = value => ['platform','gamemode','region','division','map'].every(key => typeof value?.[key] === 'string');
  if (!complete(statistics?.filters) || !complete(filters) || statisticsQuery(statistics.filters) !== statisticsQuery(filters) || !isObservationTime(statistics.fetchedAt)) return { ...history, result };
  const rows = statistics.records?.filter(row => row.hero === heroKey) ?? [];
  const pickRate = rows.length === 1 ? rows[0][metric] : null;
  if (!Number.isFinite(pickRate) || pickRate < 0 || pickRate > 100) return { ...history, result };
  const current = { collectedAt: statistics.fetchedAt, time: Date.parse(statistics.fetchedAt), [metric]: pickRate, value: pickRate, patch: null, current: true, stale: statistics.stale === true, cached: statistics.cached, providerAgeSeconds: statistics.providerAgeSeconds ?? null };
  const same = result.points.findIndex(point => point.time === current.time);
  if (same < 0) result.points.push(current);
  else if (result.points[same][metric] === pickRate) result.points[same] = { ...result.points[same], ...current, patch: result.points[same].patch };
  // A conflicting archive observation at the exact same instant is not drawn twice.
  else result.points.splice(same, 1, current);
  result.points.sort((a,b) => a.time - b.time);
  result.segments = result.segments.filter(([a,b]) => a.time !== current.time && b.time !== current.time);
  return { ...history, result, current };
}

// A connected segment is only a visual guide between known-patch observations <=24h apart.
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
      const value = rows.length === 1 ? rows[0][metric] : null;
      const valid = Number.isFinite(value) && value >= 0 && value <= 100;
      const point = { collectedAt: snapshot.collectedAt, time, [metric]: valid ? value : null, value: valid ? value : null, patch: snapshot.patch ?? null };
      const prior = byTime.get(time);
      if (prior && (prior[metric] !== point[metric] || prior.patch !== point.patch)) {
        byTime.set(time, { ...point, [metric]: null, value: null, conflict: true }); warnings.push('같은 시각의 상충 관측을 제외했습니다.');
      } else if (!prior) byTime.set(time, point);
    } catch (error) { warnings.push(error.message); }
  }
  const points = [], segments = []; let previous, gap = false;
  for (const point of [...byTime.values()].sort((a,b) => a.time - b.time)) {
    if (point[metric] == null || point.conflict) { gap = true; continue; }
    if (previous && !gap && previous.patch && point.patch === previous.patch && point.time - previous.time <= 86400000) segments.push([previous, point]);
    points.push(point); previous = point; gap = false;
  }
  return { points, segments, warnings, days, metric, filters: { ...filters } };
}

export const buildMetricHistory = buildPickHistory;
export const withCurrentMetricHistory = withCurrentPickHistory;
