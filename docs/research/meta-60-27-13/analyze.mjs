// Read-only analysis of the preserved eight-cohort dataset; no R model is used.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {attachMetaTiers} from '../../../src/domain/meta.js';
import {BASELINE_META_POLICY,LOCAL_META_EXPERIMENT,ALTERNATIVE_META_POLICY} from '../../../src/domain/metaPolicies.js';
import {normalizeStatistics} from '../../../src/models/statisticsModel.js';
const root=new URL('./',import.meta.url),buffer=await fs.readFile(new URL('../tier-design/evidence.json',root)),input=JSON.parse(buffer);
const policies={'65:25:10':BASELINE_META_POLICY,'60:27:13':LOCAL_META_EXPERIMENT,'60:25:15':ALTERNATIVE_META_POLICY};
const targets=['torbjorn','genji','pharah','tracer','junkrat','cassidy','symmetra','winston','doomfist','dmon','reinhardt','ana','kiriko','moira','juno'];
assert.equal(input.cases.length,8);assert.equal(input.heroes.records.length,54);
const rows=[],cohorts=[];
for(const c of input.cases){
 const records=normalizeStatistics(c.api.records),cohort=`${c.filters.region}/${c.filters.division}`;
 const results=Object.fromEntries(Object.entries(policies).map(([id,policy])=>[id,attachMetaTiers(input.heroes.records,records,policy)]));
 for(const [id,data] of Object.entries(results))for(const hero of data){const baseline=results['65:25:10'].find(h=>h.key===hero.key),w=policies[id].weights;
  rows.push({cohort,model:id,hero:hero.key,name:hero.name,role:hero.role,winrate:hero.statistics?.winRate,pickrate:hero.statistics?.pickRate,banrate:hero.statistics?.banRate,Qw:hero.winPercentile,Qp:hero.pickPercentile,Qb:hero.banPercentile,Wpart:w.winRate*hero.winPercentile,Ppart:w.pickRate*hero.pickPercentile,Bpart:w.banRate*hero.banPercentile,score:hero.metaScore,rank:hero.roleRank,baseRank:baseline.roleRank,rankGain:baseline.roleRank-hero.roleRank,provisionalTier:hero.provisionalTier,tier:hero.tier,baseTier:baseline.tier,capped:hero.capped,Squalified:hero.eligibility.every(r=>r.passed)});
 }
 cohorts.push({cohort,filters:c.filters,fetchedAt:c.api.fetchedAt,results});
}
assert.equal(rows.length,1296);
const metrics=data=>({count:data.length,rankChanged:data.filter(r=>r.rankGain!==0).length,tierChanged:data.filter(r=>r.tier!==r.baseTier).length,meanAbsRankChange:data.reduce((s,r)=>s+Math.abs(r.rankGain),0)/data.length,distribution:Object.fromEntries(['S','A','B','C','D'].map(t=>[t,data.filter(r=>r.tier===t).length])),lowWinTop3:data.filter(r=>r.winrate<50&&r.rank<=3),lowWinProvisionalS:data.filter(r=>r.winrate<50&&r.provisionalTier==='S'),lowWinFinalS:data.filter(r=>r.winrate<50&&r.tier==='S'),capped:data.filter(r=>r.capped).length});
const summary=Object.fromEntries(Object.keys(policies).map(id=>[id,{...metrics(rows.filter(r=>r.model===id)),roles:Object.fromEntries(['tank','damage','support'].map(role=>[role,metrics(rows.filter(r=>r.model===id&&r.role===role))]))}]));
const perCohort=Object.fromEntries(cohorts.map(c=>[c.cohort,Object.fromEntries(Object.keys(policies).map(id=>[id,metrics(rows.filter(r=>r.model===id&&r.cohort===c.cohort))]))]));
const csv=data=>{const keys=Object.keys(data[0]),quote=v=>{const t=v==null?'':String(v);return /[",\n]/.test(t)?`"${t.replaceAll('"','""')}"`:t;};return keys.join(',')+'\n'+data.map(r=>keys.map(k=>quote(r[k])).join(',')).join('\n')+'\n';};
await fs.writeFile(new URL('all-ranks.csv',root),csv(rows));await fs.writeFile(new URL('targets.csv',root),csv(rows.filter(r=>targets.includes(r.hero))));
await fs.writeFile(new URL('results.json',root),JSON.stringify({observations:432,inputSha256:createHash('sha256').update(buffer).digest('hex'),summary,perCohort},null,2)+'\n');
const table=(head,rs)=>`| ${head.join(' | ')} |\n| ${head.map(()=>'---').join(' | ')} |\n${rs.map(r=>'| '+r.join(' | ')+' |').join('\n')}\n`;
let report='# 65:25:10 / 60:27:13 / 60:25:15 비교\n\n2026-11-02의 8개 보존 조건·432개 조합이다. 현재 라이브 패치의 성능 평가나 승률 합산이 아니다. 역할 백분위와 기존 S 자격 조건을 동일하게 적용했다. R 지표는 사용하지 않는다.\n\n';
report+=table(['정책','순위 변경','티어 변경','평균 절대 순위 변화','S/A/B/C/D','저승률 Top3','제한 전 저승률 S','제한 후 저승률 S'],Object.keys(policies).map(id=>{const s=summary[id];return[id,s.rankChanged,s.tierChanged,s.meanAbsRankChange.toFixed(3),Object.values(s.distribution).join('/'),s.lowWinTop3.length,s.lowWinProvisionalS.length,s.lowWinFinalS.length];}));
for(const c of cohorts){report+=`\n## ${c.cohort}\n\n`;report+=table(['영웅','역할','승률/픽률/밴률',...Object.keys(policies)],targets.map(key=>{const h=c.results['65:25:10'].find(h=>h.key===key);return[h.name,h.role,`${h.statistics.winRate}/${h.statistics.pickRate}/${h.statistics.banRate}`,...Object.keys(policies).map(id=>{const r=c.results[id].find(h=>h.key===key);return `${r.metaScore.toFixed(2)} / ${r.roleRank} / ${r.tier}${r.capped?' (S 제한)':''}`;})];}));}
await fs.writeFile(new URL('COMPARISON.md',root),report);
console.log(JSON.stringify(Object.fromEntries(Object.entries(summary).map(([k,v])=>[k,{rankChanged:v.rankChanged,tierChanged:v.tierChanged,distribution:v.distribution,lowWinProvisionalS:v.lowWinProvisionalS.map(r=>`${r.cohort}/${r.hero}`),lowWinFinalS:v.lowWinFinalS.length}]))));
