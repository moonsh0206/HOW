// Offline reproduction over captured responses. No runtime override or snapshot writes.
import fs from 'node:fs/promises';
import {normalizeStatistics} from '../../../src/models/statisticsModel.js';
import {normalizeBlizzardStatistics} from '../../../src/models/blizzardStatisticsModel.js';
import {qualitySummary,statisticsNeedsReview} from '../../../src/models/statisticsQuality.js';
import {attachMetaTiers} from '../../../src/domain/meta.js';
const root=new URL('./',import.meta.url),read=async name=>JSON.parse(await fs.readFile(new URL(name,root),'utf8'));
const [api,original,heroes,metadata]=await Promise.all(['api.json','blizzard-data.json','heroes.json','api.metadata.json'].map(read));
const filters={platform:'pc',region:'asia',gamemode:'competitive',division:'grandmaster',map:'all'};
const records=normalizeStatistics(api),official=normalizeBlizzardStatistics(original,filters,{gamemodeKey:'1'}),after=attachMetaTiers(heroes,records);
// Mark old zeros usable ONLY to reproduce the previous unguarded calculation in this report.
const before=attachMetaTiers(heroes,records.map(r=>({...r,quality:{fields:{winRate:'verified'}}})));
const rows=after.map(h=>{const prior=before.find(r=>r.key===h.key),o=official.find(r=>r.hero===h.key);return {hero:h.key,name:h.name,winRate:h.statistics?.winRate,pickRate:h.statistics?.pickRate,banRate:h.statistics?.banRate,review:statisticsNeedsReview(h.statistics),blizzardWinRate:o?.winRate,oldRank:prior.roleRank,oldTier:prior.tier,rank:h.roleRank,tier:h.tier};});
const summary={filters,observedAt:metadata.observedAt,age:metadata.headers.Age,provider:qualitySummary(records),official:qualitySummary(official),zeroBans:records.filter(r=>r.banRate===0).length,differingHeroes:records.filter(r=>{const o=official.find(o=>o.hero===r.hero);return ['winRate','pickRate','banRate'].some(f=>r[f]!==o?.[f]);}).length,rows};
await fs.writeFile(new URL('comparison.json',root),JSON.stringify(summary,null,2)+'\n');
let report='# 동일 조회 조건 응답 대조\n\n공식 원본과 OverFast의 수집/캐시 시점이 다르며 같은 원본 응답이라고 단정하지 않는다. 아래 공식 값으로 운영 값을 덮어쓰지 않았다. old는 의심 0을 유효값으로 처리하던 이전 계산의 오프라인 재현이다.\n\n| 영웅 | OverFast 승/픽/밴 | 공식 원본 승률 | 상태 | 이전 순위/티어 | 수정 순위/티어 |\n| --- | --- | --- | --- | --- | --- |\n';
for(const r of rows)report+=`| ${r.name} | ${r.winRate}/${r.pickRate}/${r.banRate} | ${r.blizzardWinRate??'미제공'} | ${r.review?'검토 중':'추가 의심 규칙 해당 없음'} | ${r.oldRank??'—'}/${r.oldTier??'미분류'} | ${r.rank??'—'}/${r.tier??'미분류'} |\n`;
await fs.writeFile(new URL('COMPARISON.md',root),report);console.log(JSON.stringify({...summary,rows:undefined}));
