import {validateRankArchive} from '../src/models/rankArchiveModel.js';
import {LANGUAGES} from '../src/i18n/i18n.js';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pagesBase } from './pages-base.js';
import { expandSnapshotFile } from '../src/models/snapshotV2Model.js';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import {normalizePerkArchive,PERK_ARCHIVE_FILE} from '../src/models/perkArchiveModel.js';
import {normalizeOfficialPatches} from '../src/models/officialPatchModel.js';
import {normalizeRoleMeanArchive} from '../src/models/roleMeanModel.js';
import {deriveRoleMeans} from './derive-role-means.js';

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
references.push(`${base}assets/branding/HOW_logo_animation.svg`);
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
const allowed = new Set(['index.html', 'assets', 'data',...LANGUAGES,'sitemap.xml','robots.txt','route-manifest.json']);
assert((await readdir(root)).every(file => allowed.has(file)), 'Unexpected file in dist (possible private document)');
const routes=JSON.parse(await readFile(path.join(root,'route-manifest.json'),'utf8'));
assert.equal(routes.base,base);
const publicPages=new Set();
for(const entry of routes.entries){
 assert(entry.startsWith(base)&&!entry.includes('..'),'Unsafe localized route');
 const relative=entry.slice(base.length),file=path.join(root,relative,'index.html');
 assert(!publicPages.has(file),'Duplicate localized route');publicPages.add(file);
 const page=await readFile(file,'utf8');
 assert(page.includes(`lang="${relative.split('/')[0]}"`),'Localized HTML lang mismatch');
 assert(page.includes('rel="canonical"')&&LANGUAGES.every(lang=>page.includes(`hreflang="${lang}"`)),'Localized SEO links missing');
 const [language,...segments]=relative.split('/'),route=(segments.join('/')||'dashboard').replace(/\/overview$/,'');
 const canonical=new URL(page.match(/<link rel="canonical" href="([^"]+)"/)[1]);
 assert.equal(canonical.pathname,`${base}${language}/${route}`,'Canonical route mismatch');
 for(const alternate of LANGUAGES){const href=page.match(new RegExp(`<link rel="alternate" href="([^"]+)" hreflang="${alternate}"`));assert(href,'Alternate missing');assert.equal(new URL(href[1]).pathname,`${base}${alternate}/${route}`,'Alternate route mismatch');}
 if(language==='ja'){assert(!/[가-힣]/.test(page.match(/<meta name="description" content="([^"]*)"/)[1]),'Korean in Japanese description');}
}
async function verifyLocalizedTree(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);assert(!entry.isSymbolicLink(),'Unexpected localized symlink');if(entry.isDirectory())await verifyLocalizedTree(file);else assert(publicPages.has(file),'Unexpected private file in localized output');}}
for(const language of LANGUAGES)await verifyLocalizedTree(path.join(root,language));
const sitemap=await readFile(path.join(root,'sitemap.xml'),'utf8'),sitemapURLs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);assert.equal(new Set(sitemapURLs).size,sitemapURLs.length,'Duplicate sitemap URL');for(const language of LANGUAGES)assert(sitemapURLs.includes(routes.origin+base+language+'/heroes/ana/perks'),'Localized detail subpage missing from sitemap');
assert.deepEqual(await readdir(path.join(root,'data/ranks')),['current.json']);
validateRankArchive(JSON.parse(await readFile(path.join(root,'data/ranks/current.json'),'utf8')));
const manifest = JSON.parse(await readFile(path.join(root, 'data/snapshots/index.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual((await readdir(path.join(root, 'data'))).sort(), ['patches','perks','ranks','role-means','snapshots']);
assert.deepEqual(await readdir(path.join(root,'data/role-means')),['observations.json']);
normalizeRoleMeanArchive(JSON.parse(await readFile(path.join(root,'data/role-means/observations.json'),'utf8')));
const roleCheck=await deriveRoleMeans({directory:path.join(root,'data/snapshots'),output:path.join(root,'data/role-means/observations.json')});
assert.equal(roleCheck.changed,false,'Role means do not match original snapshots');
local.add(`${base}data/role-means/observations.json`);
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
