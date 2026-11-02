import { validateFilters, normalizeStatistics } from './statisticsModel.js';

export function normalizeSnapshot(raw) {
  if (!raw || raw.schemaVersion !== 1 || raw.source !== 'OverFast API' || typeof raw.collectedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw.collectedAt) || !Number.isFinite(Date.parse(raw.collectedAt)) || !raw.filters || !['platform', 'gamemode', 'region', 'division', 'map'].every(key => typeof raw.filters[key] === 'string') || raw.aggregateAt !== null || raw.patch !== null) throw new Error('스냅샷 메타데이터가 올바르지 않습니다.');
  return { ...raw, filters: validateFilters(raw.filters), records: normalizeStatistics(raw.records) };
}
