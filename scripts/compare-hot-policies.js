// Historical, real stored observations only. Never changes the operating HOT policy.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGraphBundle} from './lib/graphArchive.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../src/models/statisticsModel.js';
import {INSIGHT_POLICY,hotHeroes} from '../src/domain/insights.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const bundle=await readGraphBundle('public/data/snapshots');
const policies=[['existing',1,.5],['A',.7,.3],['B',.5,.3],['C',.5,.2]];
const frames=[...bundle.files.values()].flatMap(bytes=>expandSnapshotFile(JSON.parse(bytes),{includeDerived:true}));
const rows=[];
for(const observation of frames){
 const current={...observation,fetchedAt:observation.collectedAt};
 const previous=frames.filter(s=>{const delta=Date.parse(current.fetchedAt)-Date.parse(s.collectedAt);return statisticsQuery(s.filters)===statisticsQuery(current.filters)&&delta>=INSIGHT_POLICY.minComparisonMs&&delta<=INSIGHT_POLICY.maxComparisonMs;}).sort((a,b)=>Date.parse(b.collectedAt)-Date.parse(a.collectedAt)).find(s=>hotHeroes([],current,s).available);
 if(!previous)continue;
 const heroes=Object.entries(roster.heroes).map(([key,h])=>({key,role:h.parentRole,statistics:observation.records.find(r=>r.hero===key)}));
 rows.push({filters:observation.filters,previousAt:previous.collectedAt,currentAt:current.fetchedAt,patchWindow:current.statisticsWindow??'unverified-patch-window',policies:policies.map(([name,hotPickDelta,hotWinDelta])=>{
  const result=hotHeroes(heroes,current,previous,{...INSIGHT_POLICY,hotPickDelta,hotWinDelta,maxHotHeroes:Number.MAX_SAFE_INTEGER});
  return {name,pickThreshold:hotPickDelta,winThreshold:hotWinDelta,count:result.heroes.length,displayed:result.heroes.slice(0,3).map(h=>h.key),candidates:result.heroes.map(({key,pickDelta,winDelta})=>({key,pickDelta,winDelta}))};
 })});
}
const hashes=Object.fromEntries([...bundle.files].map(([name,bytes])=>[name,createHash('sha256').update(bytes).digest('hex')]));
const report={source:'actual local stored archive; historical comparisons at each observed timestamp, not current HOT candidates',generatedAt:new Date().toISOString(),observationCount:frames.length,comparablePairs:rows.length,operatingPolicyUnchanged:true,hashes,rows};
const root='docs/qa/stabilization';await mkdir(root,{recursive:true});await writeFile(root+'/hot-policies.json',JSON.stringify(report,null,2)+'\n');
let markdown='# Actual stored HOT policy comparison\n\nHistorical intervals only; no invented observations. Both rate increases, quality checks, minimum pick rate and maximum three displayed heroes remain required. Unknown aggregation windows are not patch effects.\n\n| Cohort | Previous UTC → current UTC | Policy | Eligible / displayed | Candidates (pick pp / win pp) |\n|---|---|---|---|---|\n';
for(const row of rows)for(const policy of row.policies)markdown+=`| ${statisticsQuery(row.filters)} | ${row.previousAt} → ${row.currentAt} | ${policy.name} | ${policy.count} / ${Math.min(3,policy.count)} | ${policy.candidates.map(h=>`${h.key} (+${h.pickDelta.toFixed(3)} / +${h.winDelta.toFixed(3)})`).join('; ')||'None'} |\n`;
if(!rows.length)markdown+='\nNo compatible actual intervals; no candidate counts can be estimated.\n';
markdown+='\nRecommendation: keep the operating thresholds until more consecutive actual observations exist across regions and composite cohorts. This small historical sample cannot estimate how often HOT will be empty in operation.\n';
await writeFile(root+'/HOT-POLICIES.md',markdown);console.log(JSON.stringify({observations:frames.length,pairs:rows.length,rows},null,2));
