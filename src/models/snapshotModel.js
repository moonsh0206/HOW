import { validateFilters, normalizeStatistics } from './statisticsModel.js';

export function isObservationTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z');
}

export function normalizeSnapshot(raw) {
  if (!raw || raw.schemaVersion !== 1 || raw.source !== 'OverFast API' || !isObservationTime(raw.collectedAt) || !raw.filters || !['platform', 'gamemode', 'region', 'division', 'map'].every(key => typeof raw.filters[key] === 'string') || raw.aggregateAt !== null || !(raw.patch === null || typeof raw.patch === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(raw.patch))) throw new Error('스냅샷 메타데이터가 올바르지 않습니다.');
  return { ...raw, filters: validateFilters(raw.filters), records: normalizeStatistics(raw.records) };
}
