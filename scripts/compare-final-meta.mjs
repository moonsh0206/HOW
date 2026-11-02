import fs from 'node:fs';
import {attachMetaTiers,attachMetaTiersV1,percentile,sEligibility} from '../src/domain/meta.js';
import {attachRoleTiers} from '../src/domain/tier.js';
const evidence=JSON.parse(fs.readFileSync('docs/research/tier-design/evidence.json','utf8'));
const heroes=evidence.heroes.records;
const keys=['genji','vendetta','venture','torbjorn','tracer','mei','domina','winston','doomfist','dmon'];
const results=evidence.cases.map(c=>{
 const records=c.api.records.map(r=>({hero:r.hero,winRate:r.winrate,pickRate:r.pickrate,banRate:r.banrate}));
 const win=attachRoleTiers(heroes,records);
 const a=win.map(h=>{const peers=win.filter(p=>p.role===h.role&&p.statistics&&Number.isFinite(p.statistics.winRate)&&Number.isFinite(p.statistics.pickRate)); const x={...h,winPercentile:percentile(h.statistics?.winRate,peers.map(p=>p.statistics.winRate)),pickPercentile:percentile(h.statistics?.pickRate,peers.map(p=>p.statistics.pickRate)),provisionalTier:h.tier}; x.eligibility=sEligibility(x,peers.length); x.capped=h.tier==='S'&&x.eligibility.some(r=>!r.passed); x.tier=x.capped?'A':h.tier;return x;});
 const models={WIN:win.map(h=>({...a.find(x=>x.key===h.key),tier:h.tier,capped:false})),LOCAL:attachMetaTiersV1(heroes,records),A:a};
 for(const [id,w] of [['B75',[.75,.2,.05]],['B65',[.65,.25,.1]],['B55',[.55,.3,.15]]]) models[id]=attachMetaTiers(heroes,records,{weights:{winRate:w[0],pickRate:w[1],banRate:w[2]},lowPickRate:1});
 return {filters:c.filters,fetchedAt:c.api.fetchedAt,models};
});
const ids=Object.keys(results[0].models);
const summaries=ids.map(id=>{let rankChanges=0,tierChanges=0,caps=0,maxShift=0,lowWinS=0,lowUsageS=0;const distribution={S:0,A:0,B:0,C:0,D:0};for(const c of results)for(const h of c.models[id]){const base=c.models.LOCAL.find(x=>x.key===h.key);rankChanges+=h.roleRank!==base.roleRank;tierChanges+=h.tier!==base.tier;maxShift=Math.max(maxShift,Math.abs(h.roleRank-base.roleRank));caps+=!!h.capped;distribution[h.tier]++;if(h.tier==='S'){lowWinS+=h.statistics.winRate<50;lowUsageS+=h.statistics.pickRate<1||h.pickPercentile<40;}}return {id,rankChanges,tierChanges,maxShift,caps,lowWinS,lowUsageS,distribution};});
let md='# Final model comparison\n\nCaptured real API evidence, not current live data. Eight independent cohorts; no pooling of rates. Full all-hero results: final-results.json. Rank is within role.\n\n'+JSON.stringify(summaries,null,2)+'\n\n';
for(const c of results){md+=`\n## ${c.filters.region}/${c.filters.division}\n\n|Hero|W/P/B|WIN|LOCAL 70/30|A|B75|B65|B55|\n|---|---|---|---|---|---|---|---|\n`;for(const k of keys){const h=c.models.B65.find(h=>h.key===k);md+=`|${h.name}|${h.statistics.winRate}/${h.statistics.pickRate}/${h.statistics.banRate}|`+ids.map(id=>{const x=c.models[id].find(h=>h.key===k);return `${x.metaScore?.toFixed(2)??'—'} · ${x.roleRank}/${x.tier}${x.capped?' (cap)':''}`;}).join('|')+'|\n';}}
md+='\n## Per-cohort tier distributions and S caps\n\n';
for(const c of results){md+=`\n### ${c.filters.region}/${c.filters.division}\n\n|Model|S/A/B/C/D|S capped|\n|---|---|---|\n`;for(const id of ids){const rows=c.models[id];md+=`|${id}|${['S','A','B','C','D'].map(t=>rows.filter(h=>h.tier===t).length).join('/')}|${rows.filter(h=>h.capped).map(h=>h.key).join(', ')||'none'}|\n`;}}
const sensitivity=[];
for(const [id,w] of [['B75',[.75,.2,.05]],['B65',[.65,.25,.1]],['B55',[.55,.3,.15]]]){
 let changed=0,maxShift=0;
 for(let i=0;i<evidence.cases.length;i++)for(const key of keys)for(const delta of [-.1,.1]){
  const records=evidence.cases[i].api.records.map(r=>({hero:r.hero,winRate:r.winrate+(r.hero===key?delta:0),pickRate:r.pickrate,banRate:r.banrate}));
  const next=attachMetaTiers(heroes,records,{weights:{winRate:w[0],pickRate:w[1],banRate:w[2]},lowPickRate:1}).find(h=>h.key===key),base=results[i].models[id].find(h=>h.key===key);
  changed+=next.tier!==base.tier;maxShift=Math.max(maxShift,Math.abs(next.roleRank-base.roleRank));
 }sensitivity.push({id,experiments:160,targetTierChanges:changed,maxRankShift:maxShift});
}
const thresholds=[];
for(const qw of [50,60,70])for(const qp of [30,40,50]){
 let s=0,caps=0;for(const c of results)for(const h of c.models.B65){const eligible=h.roleSize>=5&&h.statistics.winRate>=50&&h.statistics.pickRate>=1&&h.winPercentile>=qw&&h.pickPercentile>=qp;if(h.provisionalTier==='S'){s+=eligible;caps+=!eligible;}}
 thresholds.push({winPercentile:qw,pickPercentile:qp,S:s,caps});
}
md+='\n## Display-resolution sensitivity (hypothetical, not observations)\n\n```json\n'+JSON.stringify(sensitivity,null,2)+'\n```\n\n## S threshold sensitivity (same observed data)\n\n```json\n'+JSON.stringify(thresholds,null,2)+'\n```\n';
const csv=['region,division,model,hero,role,winrate,pickrate,banrate,score,rank,provisionalTier,tier,capped'];
for(const c of results)for(const id of ids)for(const h of c.models[id])csv.push([c.filters.region,c.filters.division,id,h.key,h.role,h.statistics.winRate,h.statistics.pickRate,h.statistics.banRate,h.metaScore??'',h.roleRank,h.provisionalTier??h.tier,h.tier,!!h.capped].join(','));
fs.writeFileSync('docs/research/tier-design/final-ranks.csv',csv.join('\n')+'\n');
fs.writeFileSync('docs/research/tier-design/FINAL-COMPARISON.md',md);fs.writeFileSync('docs/research/tier-design/final-results.json',JSON.stringify({summaries,sensitivity,thresholds,results},null,2));console.log(JSON.stringify({summaries,sensitivity,thresholds}));
