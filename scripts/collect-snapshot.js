import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
// Explicit local command only. No Git, credentials, schedule, or deployment side effects.
import { readFile, writeFile, mkdir, rename,open,unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import { parseSnapshotRequest } from './snapshot-request.js';
import {dailyCollectionDecision} from '../src/models/snapshotCollectionModel.js';
import { normalizeSnapshot } from '../src/models/snapshotModel.js';
import roster from '../src/data/subroles.json' with {type:'json'};

const request=parseSnapshotRequest(process.argv.slice(2)),DEFAULT_FILTERS=request.filters;
const root = new URL('../public/data/snapshots/', import.meta.url);
await mkdir(root, { recursive: true });
const lockPath=new URL('snapshot-collector.lock',root),lock=await open(lockPath,'wx');let writtenFile,pendingFile;
try {
const indexPath = new URL('index.json', root);
let index;
try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; index = { schemaVersion: 1, snapshots: [] }; }
if (![1,2].includes(index.schemaVersion) || !Array.isArray(index.snapshots)) throw new Error('Invalid snapshot index');
const seen=new Set();
for(const entry of index.snapshots){
 if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file)||seen.has(entry.file+':'+statisticsQuery(entry.filters)))throw new Error('Invalid indexed snapshot');seen.add(entry.file+':'+statisticsQuery(entry.filters));
 if(!['platform','region','gamemode','division','map'].every(key=>typeof entry.filters?.[key]==='string'))throw new Error('Incomplete indexed cohort');
 const saved=expandSnapshotFile(JSON.parse(await readFile(new URL(entry.file,root),'utf8'))).find(s=>statisticsQuery(s.filters)===statisticsQuery(entry.filters));
 if(!saved||saved.collectedAt!==entry.collectedAt||statisticsQuery(saved.filters)!==statisticsQuery(entry.filters)||entry.patch!==undefined&&entry.patch!==saved.patch)throw new Error('Snapshot index mismatch');
}
const collectedAt = new Date().toISOString();
const decision=dailyCollectionDecision(index.snapshots,DEFAULT_FILTERS,Date.parse(collectedAt),request.eventId);
if (!decision.collect) {
  console.log(`Skipped: ${decision.reason}`);
} else {
  const endpoint = `https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(DEFAULT_FILTERS)}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Snapshot API failed: ${response.status}; retry later, no snapshot written.`);
  const snapshot = { schemaVersion: 1, source: 'OverFast API', endpoint, filters: { ...DEFAULT_FILTERS }, collectedAt, aggregateAt: null, patch: null, patchVerification: null, retentionClass: 'detail', statisticsWindow: 'unverified-patch-window', cacheAgeSeconds: response.headers.get('age'), records: await response.json() };
  if(request.eventId)snapshot.observationEvent=request.eventId;
  const normalized=normalizeSnapshot(snapshot);
  if(normalized.records.length!==54||Object.keys(roster.heroes).some(key=>!normalized.records.some(row=>row.hero===key)))throw new Error('Incomplete roster: no snapshot written.');
  const file = collectedAt.replaceAll(':', '-') + '.json';
  await writeFile(new URL(file, root), JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  writtenFile=new URL(file,root);
  index.snapshots.push({ file, collectedAt, filters: { ...DEFAULT_FILTERS },...(request.eventId?{observationEvent:request.eventId}:{}) });
  const temporary = new URL('index.pending', root);
  await writeFile(temporary, JSON.stringify(index, null, 2) + '\n',{flag:'wx'});pendingFile=temporary;
  await rename(temporary, indexPath);
  writtenFile=null;pendingFile=null;
  console.log(`Saved ${snapshot.records.length} real records: ${fileURLToPath(new URL(file, root))}`);
}
} finally {if(pendingFile)await unlink(pendingFile).catch(()=>{});if(writtenFile)await unlink(writtenFile).catch(()=>{});await lock.close();await unlink(lockPath);}
