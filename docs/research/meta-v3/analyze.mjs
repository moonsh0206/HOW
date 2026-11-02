// Offline research only. --fetch reads the public API once per cohort; no src imports this file.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { attachMetaTiers, percentile } from '../../../src/domain/meta.js';
import { roleTier } from '../../../src/domain/tier.js';
import { normalizeStatistics, statisticsQuery } from '../../../src/models/statisticsModel.js';
import { normalizeHeroes } from '../../../src/models/heroModel.js';
const root = new URL('./', import.meta.url);
const targets = ['torbjorn', 'junkrat', 'reinhardt', 'ana', 'kiriko', 'genji', 'vendetta', 'venture', 'tracer', 'domina', 'winston', 'doomfist'];
const roles = ['tank', 'damage', 'support'];
const median = values => { const a = [...values].sort((a,b)=>a-b), m = Math.floor(a.length/2); return a.length % 2 ? a[m] : (a[m-1]+a[m])/2; };
const clamp = x => Math.max(0, Math.min(100, x));
if (process.argv.includes('--fetch')) {
  const evidence = { collectedAt: new Date().toISOString(), cases: [] };
  async function request(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const records = await response.json();
    return { url, status: response.status, fetchedAt: new Date().toISOString(), age: response.headers.get('age'), cacheControl: response.headers.get('cache-control'), records };
  }
  evidence.heroes = await request('https://overfast-api.tekrop.fr/heroes?locale=ko-kr');
  assert.equal(evidence.heroes.status, 200); normalizeHeroes(evidence.heroes.records);
  for (const division of ['diamond', 'master', 'grandmaster']) {
    const filters = { platform: 'pc', gamemode: 'competitive', region: 'asia', division, map: 'all' };
    const api = await request(`https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(filters)}`);
    evidence.cases.push({ filters, api }); console.log(`${division}: HTTP ${api.status}`);
    if (api.status !== 200) break;
    normalizeStatistics(api.records);
  }
  await fs.writeFile(new URL('evidence.json', root), JSON.stringify(evidence, null, 2) + '\n');
}
const evidence = JSON.parse(await fs.readFile(new URL('evidence.json', root), 'utf8'));
const heroes = normalizeHeroes(evidence.heroes.records);
const cohorts = evidence.cases.filter(c=>c.api.status===200).map(c=>({...c,records:normalizeStatistics(c.api.records)}));
assert.equal(cohorts.length, 3);
const models = [
  { id: 'v2', kind: 'v2' }, { id: 'P', kind: 'performance' }, { id: 'U', kind: 'usage', weight: .75 },
  ...[1.2,1.5,2].map(threshold=>({id:`H${threshold}`,kind:'performance',threshold})),
  ...[1.2,1.5,2].map(threshold=>({id:`UG${threshold}`,kind:'usage',weight:.75,threshold})),
];
function evaluate(c, policy, slope = 5) {
  const rows = attachMetaTiers(heroes,c.records);
  for(const role of roles) {
    // Usage denominator includes all role members, even if a win/ban rate is missing.
    const members=rows.filter(h=>h.role===role);
    const completePicks=members.every(h=>Number.isFinite(h.statistics?.pickRate));
    const pickSum=completePicks?members.reduce((sum,h)=>sum+h.statistics.pickRate,0):null;
    const rawWins=members.filter(h=>Number.isFinite(h.statistics?.winRate)).map(h=>h.statistics.winRate);
    const roleMedian=rawWins.length?median(rawWins):null;
    for(const h of members) {
      h.roleHeroCount=members.length; h.rolePickSum=pickSum; h.uniformShare=1/members.length;
      h.usageShare=pickSum>0?h.statistics.pickRate/pickSum:null;
      h.usageRatio=h.usageShare==null?null:h.usageShare*members.length;
      h.roleMedianWin=roleMedian;
      h.performance=Number.isFinite(h.statistics?.winRate)?clamp(50+slope*(h.statistics.winRate-50)):null;
      h.usageScore=h.usageRatio==null?null:h.usageRatio===0?0:clamp(50+25*Math.log2(h.usageRatio));
      if(policy.kind==='v2') continue;
      const valid=Number.isFinite(h.performance)&&Number.isFinite(h.usageScore);
      h.metaScore=valid?Number((policy.kind==='performance'?h.performance:policy.weight*h.performance+(1-policy.weight)*h.usageScore).toFixed(10)):null;
      h.roleRank=null;h.tier=null;h.provisionalTier=null;h.capped=false;
    }
    if(policy.kind==='v2')continue;
    const group=members.filter(h=>h.metaScore!=null).sort((a,b)=>b.metaScore-a.metaScore||a.key.localeCompare(b.key,'en'));
    let rank=0;
    group.forEach((h,i)=>{
      if(!i||h.metaScore!==group[i-1].metaScore)rank=i+1;
      h.roleRank=rank;h.provisionalTier=roleTier(rank,group.length);
      h.sEligible=policy.threshold?group.length>=5&&h.statistics.winRate>=Math.max(50,roleMedian)&&h.usageRatio>=policy.threshold:h.eligibility.every(r=>r.passed);
      h.capped=h.provisionalTier==='S'&&!h.sEligible;h.tier=h.capped?'A':h.provisionalTier;
    });
  }
  for(const h of rows) {
    if(policy.kind==='v2')h.sEligible=h.eligibility.every(r=>r.passed)&&h.metaScore!=null;
    h.contributions=policy.kind==='v2'?{win:.65*h.winPercentile,pick:.25*h.pickPercentile,ban:.1*h.banPercentile}:policy.kind==='performance'?{win:h.performance,pick:0,ban:0}:{win:policy.weight*h.performance,pick:(1-policy.weight)*h.usageScore,ban:0};
  }
  return rows;
}
const results=cohorts.map(c=>({filters:c.filters,fetchedAt:c.api.fetchedAt,models:Object.fromEntries(models.map(m=>[m.id,evaluate(c,m)]))}));
for(let i=0;i<cohorts.length;i++) {
  const baseline=attachMetaTiers(heroes,cohorts[i].records);
  for(const h of results[i].models.v2){const b=baseline.find(x=>x.key===h.key);assert.equal(h.metaScore,b.metaScore);assert.equal(h.tier,b.tier);assert.equal(h.roleRank,b.roleRank);}
  for(const role of roles){const group=results[i].models.v2.filter(h=>h.role===role);assert(Math.abs(group.reduce((sum,h)=>sum+h.usageShare,0)-1)<1e-9);assert(Math.abs(group.reduce((sum,h)=>sum+h.usageRatio,0)/group.length-1)<1e-9);}
}
const summarize=(id)=>{
  const distribution={S:0,A:0,B:0,C:0,D:0,unclassified:0};let ranks=0,tiers=0,caps=0,maxShift=0,nicheTop3=0,popularLowWinTop3=0,lowWinS=0,lowUsageS=0;
  for(const c of results)for(const h of c.models[id]) {
    const v=c.models.v2.find(x=>x.key===h.key);distribution[h.tier??'unclassified']++;ranks+=h.roleRank!==v.roleRank;tiers+=h.tier!==v.tier;caps+=h.capped;maxShift=Math.max(maxShift,Math.abs(h.roleRank-v.roleRank));
    nicheTop3+=h.roleRank!=null&&h.roleRank<=3&&h.winPercentile>=75&&h.usageRatio<1;
    popularLowWinTop3+=h.roleRank!=null&&h.roleRank<=3&&h.usageRatio>=1.5&&h.statistics.winRate<h.roleMedianWin;
    lowWinS+=h.tier==='S'&&h.statistics.winRate<50;lowUsageS+=h.tier==='S'&&h.usageRatio<1;
  }
  return {id,distribution,rankChanges:ranks,tierChanges:tiers,caps,maxShift,nicheTop3,popularLowWinTop3,lowWinS,belowAverageUsageS:lowUsageS};
};
const summary=models.map(m=>summarize(m.id));
const exaggerations=[];
for(const c of results)for(const role of roles){const rows=c.models.v2.filter(h=>h.role===role).sort((a,b)=>a.statistics.winRate-b.statistics.winRate);for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],gap=Number((b.statistics.winRate-a.statistics.winRate).toFixed(4));if(gap>0)exaggerations.push({division:c.filters.division,role,lower:a.key,upper:b.key,winGapPP:gap,percentileGap:b.winPercentile-a.winPercentile,v2WinContributionGap:.65*(b.winPercentile-a.winPercentile),rawContributionGap:5*gap});}}
exaggerations.sort((a,b)=>a.winGapPP-b.winGapPP||b.v2WinContributionGap-a.v2WinContributionGap);
const sensitivity=[];
for(const slope of [2.5,5,10])for(const weight of [.65,.75,.85]) {
  let ranks=0,tiers=0,nicheTop3=0,weakPopularTop3=0,s=0;
  for(let i=0;i<cohorts.length;i++)for(const h of evaluate(cohorts[i],{kind:'usage',weight,threshold:1.2},slope)) {
    const b=results[i].models['UG1.2'].find(x=>x.key===h.key);ranks+=h.roleRank!==b.roleRank;tiers+=h.tier!==b.tier;s+=h.tier==='S';nicheTop3+=h.roleRank<=3&&h.winPercentile>=75&&h.usageRatio<1;weakPopularTop3+=h.roleRank<=3&&h.usageRatio>=1.5&&h.statistics.winRate<h.roleMedianWin;
  }
  sensitivity.push({slope,weight,rankChangesFromUG12:ranks,tierChangesFromUG12:tiers,S:s,nicheTop3,weakPopularTop3});
}
const perturbation=[];
for(const m of models){let changes=0,maxShift=0,experiments=0;for(let i=0;i<cohorts.length;i++)for(const key of targets)for(const delta of [-.1,.1]){const altered={...cohorts[i],records:cohorts[i].records.map(r=>r.hero===key?{...r,winRate:Number((r.winRate+delta).toFixed(1))}:r)};const h=evaluate(altered,m).find(h=>h.key===key),b=results[i].models[m.id].find(h=>h.key===key);if(!h||!b)continue;experiments++;changes+=h.tier!==b.tier;maxShift=Math.max(maxShift,Math.abs(h.roleRank-b.roleRank));}perturbation.push({id:m.id,experiments,tierChanges:changes,maxShift});}
const thresholdRoles=[];
for(const c of results)for(const role of roles) {
 const group=c.models.v2.filter(h=>h.role===role);
 thresholdRoles.push({division:c.filters.division,role,N:group.length,pickSum:group[0].rolePickSum,meanPick:group[0].rolePickSum/group.length,medianUsage:median(group.map(h=>h.usageRatio)),thresholds:[1.2,1.5,2].map(t=>({threshold:t,usageEligible:group.filter(h=>h.usageRatio>=t).length,performanceAndUsageEligible:group.filter(h=>h.usageRatio>=t&&h.statistics.winRate>=Math.max(50,h.roleMedianWin)).length,H_S:c.models[`H${t}`].filter(h=>h.role===role&&h.tier==='S').length,UG_S:c.models[`UG${t}`].filter(h=>h.role===role&&h.tier==='S').length}))});
}
const pickPerturbation=[];
for(const m of models){let changes=0,allChanges=0,experiments=0;for(let i=0;i<cohorts.length;i++)for(const key of targets)for(const delta of [-.1,.1]){const altered={...cohorts[i],records:cohorts[i].records.map(r=>r.hero===key?{...r,pickRate:Number(Math.max(0,r.pickRate+delta).toFixed(1))}:r)};const rows=evaluate(altered,m),h=rows.find(h=>h.key===key),b=results[i].models[m.id].find(h=>h.key===key);if(!h||!b)continue;experiments++;changes+=h.tier!==b.tier;allChanges+=rows.filter(h=>h.tier!==results[i].models[m.id].find(b=>b.key===h.key).tier).length;}pickPerturbation.push({id:m.id,experiments,targetTierChanges:changes,allHeroTierChanges:allChanges});}
// Mathematical/data-integrity assertions, not new observed data or runtime tests.
assert.equal(clamp(50+5*(50-50)),50);
assert.equal(clamp(50+5*(50.1-50)).toFixed(6),'50.500000');
assert.equal(clamp(50+25*Math.log2(1)),50);
assert.equal(clamp(50+25*Math.log2(2)),75);
for(const c of results)for(const m of models)for(const h of c.models[m.id]){
  assert(h.metaScore>=0&&h.metaScore<=100);
  if(h.tier==='S'){assert(h.sEligible);assert(h.statistics.winRate>=50);if(m.threshold)assert(h.usageRatio>=m.threshold);}
}
let md='# Meta v3 experimental comparison\n\n';
md+=`Collected UTC ${evidence.collectedAt}. PC/Asia/competitive; independent ranks. Full formulas/limitations: ../../META-SCORE-V3-RESEARCH.md.\n\n`;
md+='## Summary\n\n```json\n'+JSON.stringify({summary,thresholdRoles,sensitivity,perturbation,pickPerturbation},null,2)+'\n```\n';
for(const c of results) {
 md+=`\n## ${c.filters.division}\n\nHOW fetched ${c.fetchedAt}; not source aggregation time.\n\n|Hero|Role|Win/Pick/Ban %|Usage share %|Usage / equal baseline|W/P/B v2 contributions|\n|---|---|---|---:|---:|---|\n`;
 for(const key of targets){const h=c.models.v2.find(h=>h.key===key);if(h)md+=`|${h.name}|${h.role}|${h.statistics.winRate}/${h.statistics.pickRate}/${h.statistics.banRate}|${(h.usageShare*100).toFixed(2)}|${h.usageRatio.toFixed(3)}|${Object.values(h.contributions).map(x=>x.toFixed(2)).join('/')}|\n`;}
 md+='\n|Hero|Model|Score|Role rank|Provisional → final|S eligible|\n|---|---|---:|---:|---|---|\n';
 for(const key of targets)for(const m of models){const h=c.models[m.id].find(h=>h.key===key);if(h)md+=`|${h.name}|${m.id}|${h.metaScore?.toFixed(2)??'—'}|${h.roleRank??'—'}|${h.provisionalTier??'—'} → ${h.tier??'—'}|${h.sEligible?'yes':'no'}|\n`;}
 md+='\n|Model|Role|S/A/B/C/D|Capped heroes|\n|---|---|---|---|\n';for(const m of models)for(const role of roles){const group=c.models[m.id].filter(h=>h.role===role);md+=`|${m.id}|${role}|${['S','A','B','C','D'].map(t=>group.filter(h=>h.tier===t).length).join('/')}|${group.filter(h=>h.capped).map(h=>h.key).join(', ')||'none'}|\n`;}
}
md+='\n## Small observed win-rate gaps\n\n```json\n'+JSON.stringify(exaggerations.slice(0,25),null,2)+'\n```\n';
const csv=['division,model,key,name,role,winRate,pickRate,banRate,usageShare,usageRatio,performance,usageScore,score,roleRank,provisionalTier,tier,S_eligible,winPercentile,pickPercentile,banPercentile,winContribution,pickContribution,banContribution'];
for(const c of results)for(const m of models)for(const h of [...c.models[m.id]].sort((a,b)=>a.role.localeCompare(b.role)||a.roleRank-b.roleRank||a.key.localeCompare(b.key)))csv.push([c.filters.division,m.id,h.key,h.name,h.role,h.statistics?.winRate??'',h.statistics?.pickRate??'',h.statistics?.banRate??'',h.usageShare??'',h.usageRatio??'',h.performance??'',h.usageScore??'',h.metaScore??'',h.roleRank??'',h.provisionalTier??'',h.tier??'',h.sEligible,h.winPercentile,h.pickPercentile,h.banPercentile,h.contributions.win,h.contributions.pick,h.contributions.ban].join(','));
await fs.writeFile(new URL('results.json',root),JSON.stringify({summary,thresholdRoles,sensitivity,perturbation,pickPerturbation,exaggerations,results},null,2)+'\n');
await fs.writeFile(new URL('COMPARISON.md',root),md);
await fs.writeFile(new URL('all-ranks.csv',root),csv.join('\n')+'\n');
const gradeChanges=['from,to,key,name,role,winrate_delta_pp,pickrate_delta_pp,usage_share_delta_pp,usage_ratio_delta'];
for(let i=1;i<results.length;i++)for(const h of results[i].models.v2){const old=results[i-1].models.v2.find(x=>x.key===h.key);if(!old)continue;gradeChanges.push([results[i-1].filters.division,results[i].filters.division,h.key,h.name,h.role,h.statistics.winRate-old.statistics.winRate,h.statistics.pickRate-old.statistics.pickRate,100*(h.usageShare-old.usageShare),h.usageRatio-old.usageRatio].join(','));}
await fs.writeFile(new URL('grade-changes.csv',root),gradeChanges.join('\n')+'\n');
async function sourceFiles(dir){const entries=await fs.readdir(dir,{withFileTypes:true});const found=[];for(const entry of entries){const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())found.push(...await sourceFiles(url));else found.push(url);}return found;}
const appRoot=new URL('../../../',root);
const files=[...await sourceFiles(new URL('src/',appRoot)),...['index.html','package.json','package-lock.json','vite.config.js'].map(path=>new URL(path,appRoot))];
const hashes={};for(const file of files)hashes[file.href.slice(appRoot.href.length)]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
await fs.writeFile(new URL('source-hashes.json',root),JSON.stringify(hashes,null,2)+'\n');
console.log(JSON.stringify({summary,thresholdRoles,sensitivity,perturbation},null,2));
