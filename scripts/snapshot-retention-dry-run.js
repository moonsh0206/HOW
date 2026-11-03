import { readFile,readdir } from 'node:fs/promises';
import { normalizeSnapshot } from '../src/models/snapshotModel.js';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import { retentionPlan } from '../src/models/snapshotRetentionModel.js';
const root=new URL('../public/data/snapshots/',import.meta.url);
const index=JSON.parse(await readFile(new URL('index.json',root),'utf8'));
if(index.schemaVersion!==1||!Array.isArray(index.snapshots))throw new Error('Invalid index');
const names=new Set(),entries=[];
for(const entry of index.snapshots){
 if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file)||names.has(entry.file))throw new Error('Unsafe or duplicate snapshot path');
 if(!['platform','gamemode','region','division','map'].every(key=>typeof entry.filters?.[key]==='string'))throw new Error('Incomplete index cohort');
 names.add(entry.file);
 const snapshot=normalizeSnapshot(JSON.parse(await readFile(new URL(entry.file,root),'utf8')));
 if(snapshot.collectedAt!==entry.collectedAt||statisticsQuery(snapshot.filters)!==statisticsQuery(entry.filters)||entry.patch!==undefined&&entry.patch!==snapshot.patch)throw new Error('Index and snapshot differ');
 entries.push({file:entry.file,snapshot});
}
const orphan=(await readdir(root)).filter(file=>file.endsWith('.json')&&file!=='index.json'&&!names.has(file));
if(orphan.length)throw new Error(`Unindexed files: ${orphan.join(', ')}`);
console.log(JSON.stringify({...retentionPlan(entries),filesValidated:entries.length,warning:'Proposal only. No writes/deletes. Git history retains old contents.'},null,2));
