import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MODELS,evaluate,rankCorrelation,pearson} from './model.mjs';
import {attachMetaTiers} from '../../../src/domain/meta.js';
import {normalizeStatistics} from '../../../src/models/statisticsModel.js';
const root=new URL('./',import.meta.url),input=new URL('../tier-design/evidence.json',root);
const source=await fs.readFile(input),evidence=JSON.parse(source),heroes=evidence.heroes.records;
assert.equal(evidence.cases.length,8);assert.equal(heroes.length,54);
const targets=['torbjorn','genji','pharah','tracer','cassidy'];
const round=x=>x==null?null:Number(x.toFixed(6));
const mean=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:null;
const rows=[],cases=[];
for(const c of evidence.cases){
 assert.equal(c.api.status,200);assert.equal(c.api.records.length,54);
 const records=normalizeStatistics(c.api.records),cohort=`${c.filters.region}/${c.filters.division}`;
 const result=Object.fromEntries(MODELS.map(model=>[model.id,evaluate(heroes,records,model,{rateContext:{...c.filters,patch:null,patchVerified:false}})]));
 const production=attachMetaTiers(heroes,records);
 for(const h of result.A){const actual=production.find(p=>p.key===h.key);assert.equal(h.score,actual.metaScore);assert.equal(h.rank,actual.roleRank);assert.equal(h.tier,actual.tier);}
 for(const model of MODELS)for(const h of result[model.id]){
  const base=result.A.find(b=>b.key===h.key);
  rows.push({cohort,region:c.filters.region,division:c.filters.division,model:model.id,hero:h.key,name:h.name,role:h.role,winrate:h.statistics?.winRate,pickrate:h.statistics?.pickRate,banrate:h.statistics?.banRate,Qwin:h.winPercentile??null,W:h.W??null,P:h.P??null,B:h.B??null,R:h.R,Wpart:h.parts?.[0]??null,Ppart:h.parts?.[1]??null,Bpart:h.parts?.[2]??null,score:h.score,rank:h.rank,baseRank:base.rank,rankGain:h.rank==null?null:base.rank-h.rank,provisionalTier:h.provisionalTier,tier:h.tier,baseTier:base.tier,tierChanged:h.tier==null?null:h.tier!==base.tier,capped:h.capped,Squalified:h.eligibility?.every(rule=>rule.passed)??null,usageRatio:h.usageRatio??null,reason:h.reason});
 }
 const metrics={};
 for(const model of MODELS){
  const data=result[model.id].filter(h=>h.score!=null);
  metrics[model.id]={scored:data.length,distribution:Object.fromEntries(['S','A','B','C','D',null].map(t=>[t??'unclassified',result[model.id].filter(h=>h.tier===t).length])),roles:{}};
  for(const role of ['tank','damage','support']){
   const group=data.filter(h=>h.role===role),baseline=result.A.filter(h=>h.role===role);
   metrics[model.id].roles[role]={rankChanges:group.filter(h=>h.rank!==baseline.find(b=>b.key===h.key).rank).length,tierChanges:group.filter(h=>h.tier!==baseline.find(b=>b.key===h.key).tier).length,meanAbsRankChange:round(mean(group.map(h=>Math.abs(h.rank-baseline.find(b=>b.key===h.key).rank)))),spearmanVsA:round(rankCorrelation(group,baseline)),lowWinTop3:group.filter(h=>h.statistics.winRate<50&&h.rank<=3).map(h=>h.key),lowWinProvisionalS:group.filter(h=>h.statistics.winRate<50&&h.provisionalTier==='S').map(h=>h.key),finalLowWinS:group.filter(h=>h.statistics.winRate<50&&h.tier==='S').map(h=>h.key),Srestricted:group.filter(h=>h.capped).map(h=>h.key),highWinLowUsageTop3:group.filter(h=>h.winPercentile>=75&&h.usageRatio<1&&h.rank<=3).map(h=>h.key)};
  }
 }
 const correlations={};for(const role of ['tank','damage','support']){const g=result.A.filter(h=>h.role===role);correlations[role]={winPick:round(pearson(g.map(h=>h.statistics.winRate),g.map(h=>h.statistics.pickRate))),winBan:round(pearson(g.map(h=>h.statistics.winRate),g.map(h=>h.statistics.banRate))),pickBan:round(pearson(g.map(h=>h.statistics.pickRate),g.map(h=>h.statistics.banRate)))};}
 cases.push({cohort,filters:c.filters,observedAt:c.api.fetchedAt,patchVerified:false,result,metrics,correlations});
}
assert.equal(rows.filter(r=>r.model==='A').length,432);
const summary={};
for(const model of MODELS){const data=rows.filter(r=>r.model===model.id&&r.score!=null);summary[model.id]={scored:data.length,rankChanges:data.filter(r=>r.rankGain!==0).length,tierChanges:data.filter(r=>r.tierChanged).length,meanAbsRankChange:round(mean(data.map(r=>Math.abs(r.rankGain)))),maxRankGain:data.length?Math.max(...data.map(r=>r.rankGain)):null,maxRankLoss:data.length?Math.min(...data.map(r=>r.rankGain)):null,distribution:Object.fromEntries(['S','A','B','C','D',null].map(t=>[t??'unclassified',rows.filter(r=>r.model===model.id&&r.tier===t).length])),lowWinTop3:data.filter(r=>r.winrate<50&&r.rank<=3).length,lowWinProvisionalS:data.filter(r=>r.winrate<50&&r.provisionalTier==='S').length,finalLowWinS:data.filter(r=>r.winrate<50&&r.tier==='S').length,capped:data.filter(r=>r.capped).length,highWinLowUsageTop3:data.filter(r=>r.Qwin>=75&&r.usageRatio<1&&r.rank<=3).length};}
const stability=[];
for(let i=0;i<cases.length;i++)for(let j=i+1;j<cases.length;j++)for(const model of MODELS.filter(m=>!m.full))for(const role of ['tank','damage','support'])stability.push({left:cases[i].cohort,right:cases[j].cohort,model:model.id,role,spearman:round(rankCorrelation(cases[i].result[model.id].filter(h=>h.role===role),cases[j].result[model.id].filter(h=>h.role===role)))});
const banPromotions=rows.filter(r=>r.model==='B20').map(r=>{const p=rows.find(x=>x.cohort===r.cohort&&x.model==='B15'&&x.hero===r.hero);return {...r,vsB15RankGain:p.rank-r.rank,vsB15Score:round(r.score-p.score)};}).filter(r=>r.vsB15RankGain>0).sort((a,b)=>b.vsB15RankGain-a.vsB15RankGain||a.cohort.localeCompare(b.cohort));
const closeWinGaps=[];
for(const c of cases)for(const role of ['tank','damage','support']){const g=[...c.result.A.filter(h=>h.role===role)].sort((a,b)=>a.statistics.winRate-b.statistics.winRate);for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],gap=b.statistics.winRate-a.statistics.winRate;if(gap>0&&gap<=.20000001)closeWinGaps.push({cohort:c.cohort,role,left:a.key,right:b.key,winGap:round(gap),percentileGap:round(b.winPercentile-a.winPercentile),raw5Gap:round(gap*5)});}}
const csv=data=>{const fields=Object.keys(data[0]);const cell=x=>{const s=x==null?'':String(x);return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};return fields.join(',')+'\n'+data.map(row=>fields.map(f=>cell(row[f])).join(',')).join('\n')+'\n';};
await fs.writeFile(new URL('all-ranks.csv',root),csv(rows));
await fs.writeFile(new URL('targets.csv',root),csv(rows.filter(r=>targets.includes(r.hero))));
await fs.writeFile(new URL('stability.csv',root),csv(stability));
await fs.writeFile(new URL('ban-promotions.csv',root),csv(banPromotions));
await fs.writeFile(new URL('results.json',root),JSON.stringify({researchOnly:true,inputObservations:432,inputHash:createHash('sha256').update(source).digest('hex'),models:MODELS,summary,cases:cases.map(({result,...c})=>c),stability,banPromotions,closeWinGaps},null,2)+'\n');
const protectedFiles=['src/domain/meta.js','src/domain/tier.js','src/models/heroModel.js','src/views/heroDetailView.js','src/views/heroView.js','src/main.js'];
const hashes={input:{path:'docs/research/tier-design/evidence.json',sha256:createHash('sha256').update(source).digest('hex')},production:{}};
for(const path of protectedFiles)hashes.production[path]=createHash('sha256').update(await fs.readFile(new URL('../../../'+path,root))).digest('hex');
await fs.writeFile(new URL('source-hashes.json',root),JSON.stringify(hashes,null,2)+'\n');
const table=(head,data)=>`| ${head.join(' | ')} |\n| ${head.map(()=>'---').join(' | ')} |\n${data.map(r=>'| '+r.join(' | ')+' |').join('\n')}\n`;
const display=r=>r?.score==null?'미계산 (R 없음)':`${r.score.toFixed(2)} / ${r.rank} / ${r.tier}${r.capped?' (S 제한)':''}`;
let report='# 8개 조건 432개 영웅·조건 조합 비교\n\n입력은 2026-11-02 보존 응답이며 현재 라이브 패치의 성능 평가가 아니다. 0–100 백분위와 기존 S 자격 조건을 유지했다. R 자료는 없어 C20/C15는 점수·순위·티어 모두 미계산이다.\n\n';
report+=table(['모델','계산','순위 변경','티어 변경','평균 절대 순위 변화','S/A/B/C/D','저승률 Top3','제한 전 저승률 S','제한 후 저승률 S'],MODELS.map(m=>{const s=summary[m.id];return[m.id,s.scored,s.rankChanges,s.tierChanges,s.meanAbsRankChange??'—',['S','A','B','C','D'].map(t=>s.distribution[t]).join('/'),s.lowWinTop3,s.lowWinProvisionalS,s.finalLowWinS];}));
report+='\n## 5개 주요 영웅 — 각 셀 점수 / 역할 순위 / 최종 티어\n\n';
for(const c of cases){report+=`### ${c.cohort}\n\n`;report+=table(['영웅','승률/픽률/밴률','A','B20','B15','B20_raw5','B20_raw10'],targets.map(key=>{const h=c.result.A.find(h=>h.key===key);return[h.name,`${h.statistics.winRate}/${h.statistics.pickRate}/${h.statistics.banRate}`,...['A','B20','B15','B20_raw5','B20_raw10'].map(id=>display(c.result[id].find(h=>h.key===key)))];}));}
report+='\n## 밴률 증액에 따른 가장 큰 순위 상승 (B20 대 B15)\n\n'+table(['조건','영웅','역할','승률/픽률/밴률','순위 상승','점수 차이'],banPromotions.slice(0,15).map(r=>[r.cohort,r.name,r.role,`${r.winrate}/${r.pickrate}/${r.banrate}`,r.vsB15RankGain,r.vsB15Score]));
report+='\n전체 영웅은 all-ranks.csv, 대상 영웅 전체 모델은 targets.csv, 역할·조건별 상세 분포는 results.json, 조건 사이 평균 동률 순위 상관은 stability.csv에 있다. 조건 간 차이는 시간 안정성이나 실제 예측 정확도가 아니다.\n';
await fs.writeFile(new URL('COMPARISON.md',root),report);
console.log(JSON.stringify({cohorts:cases.map(c=>c.cohort),observations:432,exportRows:rows.length,summary},null,2));
