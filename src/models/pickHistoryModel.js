import { statisticsQuery } from './statisticsModel.js';
import { isObservationTime } from './snapshotModel.js';

// A connected segment is only a visual guide between known-patch observations <=24h apart.
export function buildPickHistory(snapshots, heroKey, filters, { days = 7, now = Date.now() } = {}) {
  if (![7,30].includes(days) || !Number.isFinite(now) || !Array.isArray(snapshots)) throw new Error('지원하지 않는 이력 기간 또는 기준 시각입니다.');
  const query = statisticsQuery(filters), start = now - days * 86400000, byTime = new Map(), warnings = [];
  for (const snapshot of snapshots) {
    try {
      if (!isObservationTime(snapshot.collectedAt)) throw new Error('잘못된 관측 시각');
      if (!['platform','gamemode','region','division','map'].every(key => typeof snapshot.filters?.[key] === 'string') || statisticsQuery(snapshot.filters) !== query) continue;
      const time = Date.parse(snapshot.collectedAt); if (time < start || time > now) continue;
      const rows = snapshot.records?.filter(row => row.hero === heroKey) ?? [];
      const value = rows.length === 1 ? rows[0].pickRate : null;
      const valid = Number.isFinite(value) && value >= 0 && value <= 100;
      const point = { collectedAt: snapshot.collectedAt, time, pickRate: valid ? value : null, patch: snapshot.patch ?? null };
      const prior = byTime.get(time);
      if (prior && (prior.pickRate !== point.pickRate || prior.patch !== point.patch)) {
        byTime.set(time, { ...point, pickRate: null, conflict: true }); warnings.push('같은 시각의 상충 관측을 제외했습니다.');
      } else if (!prior) byTime.set(time, point);
    } catch (error) { warnings.push(error.message); }
  }
  const points = [], segments = []; let previous, gap = false;
  for (const point of [...byTime.values()].sort((a,b) => a.time - b.time)) {
    if (point.pickRate == null || point.conflict) { gap = true; continue; }
    if (previous && !gap && previous.patch && point.patch === previous.patch && point.time - previous.time <= 86400000) segments.push([previous, point]);
    points.push(point); previous = point; gap = false;
  }
  return { points, segments, warnings, days, filters: { ...filters } };
}
