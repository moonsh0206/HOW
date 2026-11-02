import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FILTERS } from '../src/models/statisticsModel.js';
import { normalizeSnapshot } from '../src/models/snapshotModel.js';
import { createSnapshotService } from '../src/services/snapshotService.js';

const snapshot = { schemaVersion: 1, source: 'OverFast API', collectedAt: '2026-11-02T00:00:00Z', aggregateAt: null, patch: null, filters: DEFAULT_FILTERS, records: [{ hero: 'ana', winrate: 50, pickrate: 20 }] };
test('snapshot: strict metadata and null/zero normalization', () => {
  assert.equal(normalizeSnapshot(snapshot).records[0].banRate, null);
  assert.throws(() => normalizeSnapshot({ ...snapshot, collectedAt: 'invalid' }));
  assert.throws(() => normalizeSnapshot({ ...snapshot, source: 'unknown' }));
});
test('snapshot service: same cohort/interval only, cached data, Pages base, no manufactured history', async () => {
  const paths = [];
  const service = createSnapshotService({ base: '/HOW/', fetcher: async url => {
    paths.push(url); return { ok: true, json: async () => url.endsWith('index.json') ? { schemaVersion: 1, snapshots: [
      { file: '../bad.json', collectedAt: snapshot.collectedAt, filters: DEFAULT_FILTERS },
      { file: '2026-11-02T00-00-00Z.json', collectedAt: snapshot.collectedAt, filters: DEFAULT_FILTERS },
    ] } : snapshot };
  } });
  assert.equal(await service.getPrevious(DEFAULT_FILTERS, '2026-11-02T00:30:00Z'), null);
  assert.equal(await service.getPrevious({ ...DEFAULT_FILTERS, region: 'europe' }, '2026-11-02T06:00:00Z'), null);
  const result = await service.getPrevious(DEFAULT_FILTERS, '2026-11-02T06:00:00Z');
  assert.equal(result.records[0].winRate, 50);
  await service.getPrevious(DEFAULT_FILTERS, '2026-11-02T06:00:00Z'); assert.equal(paths.length, 2);
  assert(paths.every(path => path.startsWith('/HOW/data/snapshots/')));
});
test('snapshot service: missing or inconsistent files are errors, not fake trends', async () => {
  const service = createSnapshotService({ fetcher: async () => ({ ok: false, status: 404 }) });
  await assert.rejects(service.getPrevious(DEFAULT_FILTERS, '2026-11-02T06:00:00Z'), /404/);
});
