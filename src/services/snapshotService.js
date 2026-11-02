import { statisticsQuery } from '../models/statisticsModel.js';
import { normalizeSnapshot } from '../models/snapshotModel.js';
import { INSIGHT_POLICY } from '../domain/insights.js';

export function createSnapshotService({ base = '/', fetcher = globalThis.fetch, now = Date.now } = {}) {
  let manifest, expires = 0, pending;
  const cache = new Map();
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
      if (data.schemaVersion !== 1 || !Array.isArray(data.snapshots)) throw new Error('스냅샷 목록 형식이 올바르지 않습니다.');
      manifest = data; expires = now() + 600000; return data;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return {
    async getPrevious(filters, currentAt) {
      const data = await index(); const time = Date.parse(currentAt);
      const matches = data.snapshots.filter(entry => {
        try {
          const delta = time - Date.parse(entry.collectedAt);
          return /^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file) && statisticsQuery(entry.filters) === statisticsQuery(filters) && delta >= INSIGHT_POLICY.minComparisonMs && delta <= INSIGHT_POLICY.maxComparisonMs;
        } catch { return false; }
      }).sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt));
      if (!matches.length) return null;
      const entry = matches[0];
      if (!cache.has(entry.file)) cache.set(entry.file, normalizeSnapshot(await json(entry.file)));
      const snapshot = cache.get(entry.file);
      if (statisticsQuery(snapshot.filters) !== statisticsQuery(filters) || snapshot.collectedAt !== entry.collectedAt) throw new Error('스냅샷 조건 또는 시각이 목록과 다릅니다.');
      return snapshot;
    },
  };
}
