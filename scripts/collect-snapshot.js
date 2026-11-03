// Explicit local command only. No Git, credentials, schedule, or deployment side effects.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import { parseSnapshotFilters } from './snapshot-options.js';
import { normalizeSnapshot } from '../src/models/snapshotModel.js';

const DEFAULT_FILTERS = parseSnapshotFilters(process.argv.slice(2));
const root = new URL('../public/data/snapshots/', import.meta.url);
await mkdir(root, { recursive: true });
const indexPath = new URL('index.json', root);
let index;
try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; index = { schemaVersion: 1, snapshots: [] }; }
if (index.schemaVersion !== 1 || !Array.isArray(index.snapshots)) throw new Error('Invalid snapshot index');
const collectedAt = new Date().toISOString();
const last = index.snapshots.filter(entry => statisticsQuery(entry.filters) === statisticsQuery(DEFAULT_FILTERS)).sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt))[0];
if (last && Date.parse(collectedAt) - Date.parse(last.collectedAt) < 86400000) {
  console.log('Skipped: same-condition snapshot collected less than 24 hours ago.');
} else {
  const endpoint = `https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(DEFAULT_FILTERS)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Snapshot API failed: ${response.status}; retry later, no snapshot written.`);
  const snapshot = { schemaVersion: 1, source: 'OverFast API', endpoint, filters: { ...DEFAULT_FILTERS }, collectedAt, aggregateAt: null, patch: null, patchVerification: null, retentionClass: 'detail', statisticsWindow: 'unverified-patch-window', cacheAgeSeconds: response.headers.get('age'), records: await response.json() };
  if (!normalizeSnapshot(snapshot).records.length) throw new Error('Empty response: no snapshot written.');
  const file = collectedAt.replaceAll(':', '-') + '.json';
  await writeFile(new URL(file, root), JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  index.snapshots.push({ file, collectedAt, filters: { ...DEFAULT_FILTERS } });
  const temporary = new URL('index.pending', root);
  await writeFile(temporary, JSON.stringify(index, null, 2) + '\n');
  await rename(temporary, indexPath);
  console.log(`Saved ${snapshot.records.length} real records: ${fileURLToPath(new URL(file, root))}`);
}
