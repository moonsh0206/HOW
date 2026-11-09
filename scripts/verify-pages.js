import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pagesBase } from './pages-base.js';
import { expandSnapshotFile } from '../src/models/snapshotV2Model.js';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import {normalizePerkArchive,PERK_ARCHIVE_FILE} from '../src/models/perkArchiveModel.js';
import {normalizeOfficialPatches} from '../src/models/officialPatchModel.js';

const base = pagesBase(process.env.VITE_BASE_PATH);
const root = path.resolve('dist');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const files = await readdir(path.join(root, 'assets'));
assert(files.some(file => file.endsWith('.js')), 'JS bundle missing');
assert(files.some(file => file.endsWith('.css')), 'CSS bundle missing');
const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
const cssFiles = files.filter(file => file.endsWith('.css'));
for (const file of cssFiles) {
  const css = await readFile(path.join(root, 'assets', file), 'utf8');
  references.push(...[...css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)].map(match => match[1]));
}
const local = new Set();
for (const ref of references) {
  if (/^(https:|data:)/.test(ref)) continue;
  assert(!/^(http:|file:|[A-Za-z]:)/.test(ref), `Unsafe asset URL: ${ref}`);
  assert(ref.startsWith(base), `Asset does not use ${base}: ${ref}`);
  const relative = decodeURIComponent(ref.slice(base.length).split(/[?#]/)[0]);
  const target = path.resolve(root, relative);
  assert(target.startsWith(root + path.sep), 'Asset escapes dist');
  assert((await stat(target)).isFile(), `Asset missing: ${relative}`);
  local.add(ref);
}
assert([...local].some(ref => ref.endsWith('/hero-banner.jpg')), 'Banner URL not found in built CSS');
const allowed = new Set(['index.html', 'assets', 'data']);
assert((await readdir(root)).every(file => allowed.has(file)), 'Unexpected file in dist (possible private document)');
const manifest = JSON.parse(await readFile(path.join(root, 'data/snapshots/index.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual((await readdir(path.join(root, 'data'))).sort(), ['patches','perks','snapshots']);
assert.deepEqual(await readdir(path.join(root,'data/patches')),['notes.json']);
normalizeOfficialPatches(JSON.parse(await readFile(path.join(root,'data/patches/notes.json'),'utf8')));
local.add(`${base}data/patches/notes.json`);
const perkFiles=await readdir(path.join(root,'data/perks'));
assert.deepEqual(perkFiles,[PERK_ARCHIVE_FILE],'Unexpected perk data file');
const perkArchive=normalizePerkArchive(JSON.parse(await readFile(path.join(root,'data/perks',PERK_ARCHIVE_FILE),'utf8')));
assert.equal(perkArchive.frames.size,54,'Perk archive missing heroes');
local.add(`${base}data/perks/${PERK_ARCHIVE_FILE}`);
const snapshotFiles = new Set(['index.json']);
local.add(`${base}data/snapshots/index.json`);
for (const entry of manifest.snapshots) {
  assert(/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file), 'Invalid snapshot file path');
  assert((await stat(path.join(root, 'data/snapshots', entry.file))).isFile(), 'Snapshot file missing');
  const snapshots = expandSnapshotFile(JSON.parse(await readFile(path.join(root, 'data/snapshots', entry.file), 'utf8')));
  const snapshot=snapshots.find(row=>row.collectedAt===entry.collectedAt&&statisticsQuery(row.filters)===statisticsQuery(entry.filters));
  assert(snapshot, 'Indexed cohort/time missing in snapshot file');
  assert.equal(snapshot.collectedAt, entry.collectedAt);
  assert.equal(statisticsQuery(snapshot.filters), statisticsQuery(entry.filters));
  snapshotFiles.add(entry.file); local.add(`${base}data/snapshots/${entry.file}`);
}
assert((await readdir(path.join(root, 'data/snapshots'))).every(file => snapshotFiles.has(file)), 'Unexpected file in snapshot output');
const httpOrigin = process.argv[2];
if (httpOrigin) {
  const origin = new URL(httpOrigin);
  assert(['127.0.0.1', 'localhost'].includes(origin.hostname) && origin.protocol === 'http:', 'Local preview URL required');
  for (const ref of [base, ...local]) {
    const response = await fetch(new URL(ref, origin), { signal: AbortSignal.timeout(10000) });
    assert(response.ok, `${ref} returned HTTP ${response.status}`);
    const type = response.headers.get('content-type') ?? '';
    if (ref.endsWith('.js')) assert(/javascript/.test(type), 'JS returned fallback HTML');
    if (ref.endsWith('.css')) assert(/text\/css/.test(type), 'CSS returned fallback HTML');
    if (ref.endsWith('.jpg')) assert(/image\/jpeg/.test(type), 'Image returned fallback HTML');
    if (ref.endsWith('.json')) assert(/application\/json/.test(type), 'Snapshot returned fallback HTML');
  }
}
console.log(`Pages assets verified: base=${base}, ${local.size} local assets${httpOrigin ? ', HTTP responses and MIME types verified' : ''}.`);
