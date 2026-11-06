import { statisticsQuery,isCompositeDivision,divisionMembers } from '../models/statisticsModel.js';
import {combineDivisionHistory} from '../models/compositeHistoryModel.js';
import { normalizeSnapshot, isObservationTime } from '../models/snapshotModel.js';
import {expandSnapshotFile} from '../models/snapshotV2Model.js';
import { INSIGHT_POLICY } from '../domain/insights.js';

export function createSnapshotService({ base = '/', fetcher = globalThis.fetch, now = Date.now } = {}) {
  let manifest, expires = 0, pending;
  const cache = new Map();
  const filePending = new Map();
  async function json(path) {
    const response = await fetcher(`${base}data/snapshots/${path}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`이전 통계 파일 연결 실패 (${response.status})`);
    return response.json();
  }
  async function index() {
    if (manifest && now() < expires) return manifest;
    if (pending) return pending;
    pending = (async () => {
      const data = await json('index.json');
      if (![1,2].includes(data.schemaVersion) || !Array.isArray(data.snapshots)) throw new Error('스냅샷 목록 형식이 올바르지 않습니다.');
      manifest = data; expires = now() + 600000; return data;
    })();
    try { return await pending; } finally { pending = null; }
  }
  function matches(entry, filters) {
    try { return /^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file) && isObservationTime(entry.collectedAt) && ['platform','gamemode','region','division','map'].every(key => typeof entry.filters?.[key] === 'string') && statisticsQuery(entry.filters) === statisticsQuery(filters); }
    catch { return false; }
  }
  async function read(entry, filters) {
    if (!cache.has(entry.file)) {
      if (!filePending.has(entry.file)) filePending.set(entry.file, json(entry.file).then(expandSnapshotFile).then(result => { cache.set(entry.file, result); return result; }).finally(() => filePending.delete(entry.file)));
      await filePending.get(entry.file);
    }
    const snapshot = cache.get(entry.file).find(s=>statisticsQuery(s.filters)===statisticsQuery(filters)&&s.collectedAt===entry.collectedAt);
    if(!snapshot)throw new Error('요청 등급의 원본 기록이 파일에 없습니다.');
    if (statisticsQuery(snapshot.filters) !== statisticsQuery(filters) || snapshot.collectedAt !== entry.collectedAt || entry.patch !== undefined && entry.patch !== snapshot.patch) { cache.delete(entry.file); throw new Error('스냅샷 조건 또는 시각이 목록과 다릅니다.'); }
    return snapshot;
  }
  const service = {
    async getHistory(filters, { days = 7, scope = 'range' } = {}) {
      if(isCompositeDivision(filters.division)){
        const parts=await Promise.all(divisionMembers(filters.division).map(division=>service.getHistory({...filters,division},{days,scope})));
        return {snapshots:combineDivisionHistory(parts.flatMap(p=>p.snapshots),filters),warnings:parts.flatMap(p=>p.warnings),gaps:[],observedUntil:new Date(now()).toISOString()};
      }
      if (![7,30].includes(days)) throw new Error('지원하지 않는 이력 기간입니다.');
      if (!['range','patch','compare'].includes(scope)) throw new Error('지원하지 않는 이력 보기입니다.');
      const data = await index(), end = now(), start = scope === 'range' ? end - days * 86400000 : -Infinity;
      const entries = data.snapshots.filter(entry => matches(entry, filters) && Date.parse(entry.collectedAt) >= start && Date.parse(entry.collectedAt) <= end);
      const snapshots = [], warnings = [], gaps = [];
      for (let i = 0; i < entries.length; i += 8) {
        const group = entries.slice(i, i + 8);
        const results = await Promise.allSettled(group.map(entry => read(entry, filters)));
        results.forEach((result, j) => { if (result.status === 'fulfilled') snapshots.push(result.value); else { warnings.push(`${group[j].collectedAt}: ${result.reason.message}`); gaps.push(group[j]); } });
      }
      return { snapshots, warnings, gaps, observedUntil: new Date(end).toISOString() };
    },
    async getPrevious(filters, currentAt) {
      if(isCompositeDivision(filters.division)){
        const data=await service.getHistory(filters,{days:7,scope:'range'});
        return data.snapshots.filter(s=>{const delta=Date.parse(currentAt)-Date.parse(s.collectedAt);return delta>=INSIGHT_POLICY.minComparisonMs&&delta<=INSIGHT_POLICY.maxComparisonMs;}).sort((a,b)=>Date.parse(b.collectedAt)-Date.parse(a.collectedAt))[0]??null;
      }
      const data = await index(); const time = Date.parse(currentAt);
      const matches = data.snapshots.filter(entry => {
        try {
          const delta = time - Date.parse(entry.collectedAt);
          return /^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file) && statisticsQuery(entry.filters) === statisticsQuery(filters) && delta >= INSIGHT_POLICY.minComparisonMs && delta <= INSIGHT_POLICY.maxComparisonMs;
        } catch { return false; }
      }).sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt));
      if (!matches.length) return null;
      const entry = matches[0];
      return read(entry, filters);
    },
  };
  return service;
}
