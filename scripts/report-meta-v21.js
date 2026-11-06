import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {normalizeHeroes} from '../src/models/heroModel.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {attachMetaTiers} from '../src/domain/meta.js';
import {applyRecommendationPolicy} from '../src/domain/recommendationPolicy.js';
const heroes=normalizeHeroes(JSON.parse(await readFile('tests/fixtures/overfast-heroes.json','utf8')));
export async function compareStoredPolicies(){
 const cohorts=[];
 for(const file of await readdir('public/data/snapshots')){
  if(file==='index.json'||!file.endsWith('.json'))continue;
  const raw=JSON.parse(await readFile(`public/data/snapshots/${file}`,'utf8'));
  for(const frame of expandSnapshotFile(raw,{includeDerived:true})){
   const before=attachMetaTiers(heroes,frame.records),after=before.map(applyRecommendationPolicy);
   for(let i=0;i<before.length;i++)for(const field of ['metaScore','roleRank','winPercentile','pickPercentile','banPercentile','provisionalTier','eligibility'])assert.deepEqual(after[i][field],before[i][field]);
   cohorts.push({file,filters:frame.filters,collectedAt:frame.collectedAt,changed:after.filter(h=>h.tier!==h.baselineTier).map(h=>h.key),groups:Object.fromEntries(['a-standard','a-conditional','a-low'].map(g=>[g,after.filter(h=>h.recommendationGroup===g).length])),heroes:after.map(h=>({key:h.key,name:h.name,pickRate:h.statistics?.pickRate,winRate:h.statistics?.winRate,metaScore:h.metaScore,roleRank:h.roleRank,before:h.baselineTier,after:h.tier,group:h.recommendationGroup}))});
  }
 }
 return cohorts;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/report-meta-v21.js')){
 const cohorts=await compareStoredPolicies();await mkdir('docs/research/meta-v21',{recursive:true});
 await writeFile('docs/research/meta-v21/comparison.json',JSON.stringify(cohorts,null,2)+'\n');
 console.log(JSON.stringify(cohorts.map(({file,filters,changed,groups,heroes})=>({file,region:filters.region,division:filters.division,changed,groups,...(filters.region==='asia'&&filters.division==='diamond_plus'?{examples:heroes.filter(h=>['junkrat','shion','domina'].includes(h.key))}:{})})),null,2));
}
