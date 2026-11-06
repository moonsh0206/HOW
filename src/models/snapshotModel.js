import { validateFilters, normalizeStatistics,isCompositeDivision } from './statisticsModel.js';
import {originalProvenance} from './statisticsProvenance.js';

export function isObservationTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z');
}

export function normalizeSnapshot(raw) {
  if(isCompositeDivision(raw?.filters?.division))throw new Error('합성 등급 원본 스냅샷은 허용하지 않습니다.');
  if (!raw || raw.schemaVersion !== 1 || raw.source !== 'OverFast API' || !isObservationTime(raw.collectedAt) || !raw.filters || !['platform', 'gamemode', 'region', 'division', 'map'].every(key => typeof raw.filters[key] === 'string') || raw.aggregateAt !== null || !(raw.patch === null || typeof raw.patch === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(raw.patch))) throw new Error('스냅샷 메타데이터가 올바르지 않습니다.');
  return { ...raw, filters: validateFilters(raw.filters), records: normalizeStatistics(raw.records),provenance:originalProvenance(raw.filters) };
}
