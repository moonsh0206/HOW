import { readFile,readdir } from 'node:fs/promises';
import { expandSnapshotFile } from '../src/models/snapshotV2Model.js';
import { statisticsQuery } from '../src/models/statisticsModel.js';
import { archiveRetentionPlan,preservationTags } from '../src/models/snapshotArchiveModel.js';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
const args=process.argv.slice(2);if(args.length&&(args.length!==2||args[0]!=='--days'||!/^\d+$/.test(args[1])))throw new Error('Usage: --days 14');
const days=args.length?Number(args[1]):14;
const root=new URL('../public/data/snapshots/',import.meta.url);
const index=JSON.parse(await readFile(new URL('index.json',root),'utf8'));
if(![1,2].includes(index.schemaVersion)||!Array.isArray(index.snapshots))throw new Error('Invalid index');
const names=new Set(),cohorts=new Set(),entries=[];
for(const entry of index.snapshots){
 const key=entry.file+':'+statisticsQuery(entry.filters);
 if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file)||cohorts.has(key))throw new Error('Unsafe or duplicate snapshot path');cohorts.add(key);
 if(!['platform','gamemode','region','division','map'].every(key=>typeof entry.filters?.[key]==='string'))throw new Error('Incomplete index cohort');
 names.add(entry.file);
 const raw=JSON.parse(await readFile(new URL(entry.file,root),'utf8'));
 const snapshot=expandSnapshotFile(raw).find(s=>statisticsQuery(s.filters)===statisticsQuery(entry.filters));
 if(!snapshot)throw new Error('Indexed division missing');
 if(snapshot.collectedAt!==entry.collectedAt||statisticsQuery(snapshot.filters)!==statisticsQuery(entry.filters)||entry.patch!==undefined&&entry.patch!==snapshot.patch)throw new Error('Index and snapshot differ');
 entries.push({...entry,schemaVersion:raw.schemaVersion,snapshot});
}
const orphan=(await readdir(root)).filter(file=>file.endsWith('.json')&&file!=='index.json'&&!names.has(file));
if(orphan.length)throw new Error(`Unindexed files: ${orphan.join(', ')}`);
const tags=preservationTags(entries,PATCH_CATALOG);
console.log(JSON.stringify({...archiveRetentionPlan(entries.map(e=>({...e,preserveTags:[...(e.preserveTags??[]),...(tags[e.file]??[])]})),{days}),proposedPreserveTags:tags,filesValidated:names.size,warning:'Proposal only. No writes/deletes. Git history retains old contents.'},null,2));
