// Read-only archive comparison. No collection, index edits or operating data writes.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../src/models/statisticsModel.js';
import {hotHeroes,INSIGHT_POLICY} from '../src/domain/insights.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const root=new URL('../public/data/snapshots/',import.meta.url);
const indexBytes=await readFile(new URL('index.json',root));const index=JSON.parse(indexBytes);
const hashes={'index.json':createHash('sha256').update(indexBytes).digest('hex')},observations=[];
for(const file of new Set(index.snapshots.map(row=>row.file))){
 if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(file))throw Error('Unsafe archive path');
 const bytes=await readFile(new URL(file,root));hashes[file]=createHash('sha256').update(bytes).digest('hex');
 observations.push(...expandSnapshotFile(JSON.parse(bytes),{includeDerived:true}));
}
const results=[];
for(const current of observations){
 const eligible=observations.filter(old=>statisticsQuery(old.filters)===statisticsQuery(current.filters)&&Date.parse(current.collectedAt)-Date.parse(old.collectedAt)>=INSIGHT_POLICY.minComparisonMs&&Date.parse(current.collectedAt)-Date.parse(old.collectedAt)<=INSIGHT_POLICY.maxComparisonMs).sort((a,b)=>Date.parse(b.collectedAt)-Date.parse(a.collectedAt));
 const previous=eligible[0];if(!previous)continue;
 const heroes=Object.entries(roster.heroes).map(([key,row])=>({key,name:key,role:row.parentRole,statistics:current.records.find(r=>r.hero===key)}));
 const frame={...current,fetchedAt:current.collectedAt};
 const old=hotHeroes(heroes,frame,previous,{...INSIGHT_POLICY,hotWinDelta:0,maxHotHeroes:Number.MAX_SAFE_INTEGER});
 const next=hotHeroes(heroes,frame,previous);
 const before=old.heroes.sort((a,b)=>b.pickDelta-a.pickDelta||b.winDelta-a.winDelta||a.key.localeCompare(b.key,'en')).slice(0,3);
 const compact=rows=>rows.map(({key,pickDelta,winDelta})=>({key,pickDelta,winDelta}));
 results.push({filters:current.filters,currentAt:current.collectedAt,previousAt:previous.collectedAt,available:next.available,reason:next.reason,warning:next.warning??null,before:compact(before),after:compact(next.heroes)});
}
const output=new URL('../docs/qa/hot-v2/',import.meta.url);await mkdir(output,{recursive:true});
const unchanged=(await Promise.all(Object.entries(hashes).map(async([file,hash])=>createHash('sha256').update(await readFile(new URL(file,root))).digest('hex')===hash))).every(Boolean);
if(!unchanged)throw Error('Archive changed during report');
await writeFile(new URL('comparison.json',output),JSON.stringify({policy:INSIGHT_POLICY,observationCount:observations.length,comparablePairs:results.length,archiveUnchanged:unchanged,hashes,results},null,2)+'\n');
const cell=items=>items.map(h=>`${h.key} (W +${h.winDelta.toFixed(2)} pp / P +${h.pickDelta.toFixed(2)} pp)`).join('; ')||'None';
await writeFile(new URL('COMPARISON.md',output),'# Stored observations: HOT v1 vs v2\n\nRead-only actual JSON archive, including valid same-batch derived divisions. Most recent eligible 1–7 day prior per observation, matching existing history lookup. No API collection or synthetic history.\n\n| Cohort | Previous UTC | Current UTC | Status | Before | After |\n|---|---|---|---|---|---|\n'+results.map(r=>`| ${statisticsQuery(r.filters)} | ${r.previousAt} | ${r.currentAt} | ${r.available?'Comparable':r.reason} | ${cell(r.before)} | ${cell(r.after)} |`).join('\n')+'\n\n'+`${observations.length} restored observations; ${results.length} eligible date pairs; original file and index SHA-256 unchanged: ${unchanged}. Missing previous cohorts are not populated.\n`);
console.log(JSON.stringify({observationCount:observations.length,comparablePairs:results.length,results},null,2));
