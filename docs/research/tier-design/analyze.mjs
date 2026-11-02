// Offline research sandbox. No imports into src and no modifications to application files.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { attachMetaTiersV1 as attachMetaTiers, percentile } from '../../../src/domain/meta.js';
import { roleTier } from '../../../src/domain/tier.js';

const root = new URL('./', import.meta.url);
const evidence = JSON.parse(await fs.readFile(new URL('evidence.json', root), 'utf8'));
const heroes = evidence.heroes.records;
const targetKeys = ['genji', 'vendetta', 'venture', 'torbjorn', 'tracer', 'mei', 'domina', 'winston', 'doomfist', 'dmon'];
const normalize = raw => raw.map(row => ({ hero: row.hero, winRate: row.winrate, pickRate: row.pickrate, banRate: row.banrate }));
const models = [
  { id: 'C0', name: '현재 HOW 70/30', weights: [.7, .3, 0] },
  { id: 'C1', name: '백분위 75/20/5', weights: [.75, .20, .05] },
  { id: 'C2', name: '백분위 65/25/10', weights: [.65, .25, .10] },
  { id: 'C3', name: '백분위 55/30/15', weights: [.55, .30, .15] },
  { id: 'C4', name: '70/30 + 상위 티어 자격 제한', weights: [.7, .3, 0], gated: true },
  { id: 'C5', name: '75/20/5 + 비선형 채용 보정', weights: [.75, .20, .05], nonlinear: true },
];
const valid = value => Number.isFinite(value) && value >= 0 && value <= 100;
const median = values => { const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const tierIndex = tier => ['S', 'A', 'B', 'C', 'D'].indexOf(tier);
function score(records, model) {
  const map = new Map(records.map(record => [record.hero, record]));
  const output = heroes.map(hero => ({ key: hero.key, name: hero.name, role: hero.role, statistics: map.get(hero.key), score: null, rank: null, tier: null, provisionalTier: null, reasons: [] }));
  for (const role of ['tank', 'damage', 'support']) {
    const group = output.filter(hero => hero.role === role && valid(hero.statistics?.winRate) && valid(hero.statistics?.pickRate) && (!model.weights[2] || valid(hero.statistics?.banRate)));
    if (!group.length) continue;
    const wins = group.map(hero => hero.statistics.winRate), picks = group.map(hero => hero.statistics.pickRate), bans = group.map(hero => hero.statistics.banRate);
    const middlePick = median(picks);
    for (const hero of group) {
      const s = hero.statistics;
      hero.qw = percentile(s.winRate, wins); hero.qp = percentile(s.pickRate, picks); hero.qb = valid(s.banRate) ? percentile(s.banRate, bans.filter(valid)) : null;
      const base = model.weights[0] * hero.qw + model.weights[1] * hero.qp + model.weights[2] * (hero.qb ?? 0);
      hero.pickFactor = model.nonlinear ? (middlePick > 0 ? Math.min(1, Math.sqrt(s.pickRate / middlePick)) : 0) : 1;
      hero.score = Number((base * hero.pickFactor).toFixed(10));
    }
    group.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key, 'en'));
    let rank;
    group.forEach((hero, index) => {
      if (!index || hero.score !== group[index - 1].score) rank = index + 1;
      hero.rank = rank; hero.provisionalTier = roleTier(rank, group.length); hero.tier = hero.provisionalTier;
      if (model.gated) {
        let cap = 0;
        if (hero.statistics.winRate < 50) { cap = 1; hero.reasons.push('승률 50% 미만: 최대 A'); }
        if (hero.statistics.pickRate < 1) { cap = 1; hero.reasons.push('픽률 1% 미만: 최대 A'); }
        if (group.length < 5 || hero.qw < 60 || hero.qp < 40) { cap = Math.max(cap, 1); hero.reasons.push('S 자격 미충족: 최대 A'); }
        hero.tier = ['S', 'A', 'B', 'C', 'D'][Math.max(tierIndex(hero.tier), cap)];
      }
    });
  }
  return output;
}

const cohorts = evidence.cases.filter(entry => entry.api.status === 200 && entry.official?.status === 200).map(entry => ({ ...entry, records: normalize(entry.api.records) }));
const results = cohorts.map(cohort => ({ filters: cohort.filters, fetchedAt: cohort.api.fetchedAt, models: Object.fromEntries(models.map(model => [model.id, score(cohort.records, model)])) }));
// Validate the research baseline against the real current code (no duplicated hidden baseline).
for (let i = 0; i < cohorts.length; i++) {
  const actual = attachMetaTiers(heroes, cohorts[i].records);
  for (const hero of results[i].models.C0) {
    const production = actual.find(row => row.key === hero.key);
    assert.equal(hero.score, production.metaScore); assert.equal(hero.rank, production.roleRank); assert.equal(hero.tier, production.tier);
  }
  for (const hero of results[i].models.C4) if (hero.tier === 'S') { assert(hero.statistics.winRate >= 50); assert(hero.statistics.pickRate >= 1); assert(hero.qw >= 60 && hero.qp >= 40); }
}
// Hypothetical regression checks, explicitly separate from observed data.
const synthetic = heroes.map((hero, index) => ({ hero: hero.key, winRate: 45 + index / 100, pickRate: index % 2 ? .5 : 15, banRate: 10 }));
assert(score(synthetic, models.find(model => model.id === 'C4')).every(hero => hero.tier !== 'S'));
const incomplete = score([{ hero: 'genji', winRate: 55, pickRate: null, banRate: 0 }], models[4]);
assert.equal(incomplete.find(hero => hero.key === 'genji').tier, null);

const quality = cohorts.map(cohort => {
  const official = new Map(cohort.official.records.map(row => [row.hero, row]));
  const payloadDifferences = [], slotDifferences = [];
  for (const row of cohort.api.records) for (const field of ['winrate', 'pickrate', 'banrate']) {
    if (row[field] !== official.get(row.hero)?.[field]) payloadDifferences.push({ hero: row.hero, field, api: row[field], official: official.get(row.hero)?.[field] });
    const slot = cohort.official.visibleSlots[row.hero]?.[field];
    if (slot && Number.parseFloat(slot) !== official.get(row.hero)?.[field]) slotDifferences.push({ hero: row.hero, field, data: official.get(row.hero)?.[field], slot });
  }
  return { filters: cohort.filters, selected: cohort.official.selected, payloadDifferences, slotDifferences, maxSlotDifference: Math.max(0, ...slotDifferences.map(row => Math.abs(row.data - Number.parseFloat(row.slot)))), sourceMissing: cohort.official.records.filter(row => ['winrate', 'pickrate', 'banrate'].some(field => row[field] === -1)).length };
});

const summaries = models.map(model => {
  let classified = 0, changedRank = 0, changedTier = 0, sCount = 0, lowWinS = 0, lowUsageS = 0, caps = 0, maxShift = 0;
  for (const cohort of results) for (const hero of cohort.models[model.id]) {
    const baseline = cohort.models.C0.find(row => row.key === hero.key);
    if (hero.rank == null) continue;
    classified++; changedRank += hero.rank !== baseline.rank; changedTier += hero.tier !== baseline.tier; caps += hero.tier !== hero.provisionalTier;
    maxShift = Math.max(maxShift, Math.abs(hero.rank - baseline.rank));
    if (hero.tier === 'S') { sCount++; lowWinS += hero.statistics.winRate < 50; lowUsageS += hero.qp < 40 || hero.statistics.pickRate < 1; }
  }
  return { model: model.id, classified, changedRank, changedTier, maxShift, sCount, lowWinS, lowUsageS, caps };
});

// Deterministic display-resolution sensitivity. Not new observations, CIs, or synthetic UI data.
const sensitivities = [];
for (const model of models) {
  let experiments = 0, changedTargetTiers = 0, changedAnyTiers = 0, maxRankShift = 0;
  for (let i = 0; i < cohorts.length; i++) for (const key of targetKeys) for (const delta of [-.1, .1]) {
    const records = cohorts[i].records.map(row => row.hero === key ? { ...row, winRate: Math.max(0, Math.min(100, Number((row.winRate + delta).toFixed(1)))) } : row);
    const altered = score(records, model); const original = results[i].models[model.id];
    const before = original.find(row => row.key === key), after = altered.find(row => row.key === key);
    experiments++; changedTargetTiers += before.tier !== after.tier;
    changedAnyTiers += altered.some(row => row.tier !== original.find(before => before.key === row.key).tier);
    maxRankShift = Math.max(maxRankShift, Math.abs(after.rank - before.rank));
  }
  sensitivities.push({ model: model.id, experiments, changedTargetTiers, changedAnyTiers, maxRankShift });
}

const report = { generatedAt: new Date().toISOString(), evidenceAt: evidence.collectedAt, models, quality, summaries, sensitivities, results };
await fs.writeFile(new URL('results.json', root), JSON.stringify(report, null, 2) + '\n');
const csv = ['region,division,hero,name,role,winrate,pickrate,banrate,model,score,rank,provisional_tier,final_tier,win_percentile,pick_percentile,ban_percentile,reason'];
for (const cohort of results) for (const model of models) for (const hero of cohort.models[model.id].filter(row => targetKeys.includes(row.key))) csv.push([cohort.filters.region, cohort.filters.division, hero.key, hero.name, hero.role, hero.statistics?.winRate, hero.statistics?.pickRate, hero.statistics?.banRate, model.id, hero.score, hero.rank, hero.provisionalTier, hero.tier, hero.qw, hero.qp, hero.qb, hero.reasons.join(';')].map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));
await fs.writeFile(new URL('candidate-comparison.csv', root), '\uFEFF' + csv.join('\n') + '\n');

const diamond = results.find(row => row.filters.region === 'asia' && row.filters.division === 'diamond');
const lines = ['# 실제 응답 기반 후보 알고리즘 비교 부록', '', `관측 ${evidence.collectedAt} · PC/경쟁전/전체 전장. 점수순 역할 내 순위이며 C4 티어는 자격 제한 후 결과입니다. C4에서 낮아진 티어의 자리를 다른 영웅으로 채우지 않습니다. 모든 후보는 HOW 연구안이며 OP.GG 공식 수식이 아닙니다.`, '', '## 기본 아시아 다이아몬드: 실제 입력과 현재 HOW', '', '| 영웅 | 역할 | 승률% | 픽률% | 밴률% | 현재 점수 | 현재 순위/티어 |', '| --- | --- | --- | --- | --- | --- | --- |'];
const number = value => value == null ? '미분류' : Number(value).toFixed(2);
for (const key of targetKeys) {
  const hero = diamond.models.C0.find(row => row.key === key);
  lines.push(`| ${hero.name} | ${hero.role} | ${number(hero.statistics.winRate)} | ${number(hero.statistics.pickRate)} | ${number(hero.statistics.banRate)} | ${number(hero.score)} | ${hero.rank}/${hero.tier} |`);
}
lines.push('', '## 후보별 점수 / 역할 내 순위 / 최종 티어', '', '| 영웅 | C1 75/20/5 | C2 65/25/10 | C3 55/30/15 | C4 자격 제한 | C5 비선형 |', '| --- | --- | --- | --- | --- | --- |');
for (const key of targetKeys) lines.push(`| ${diamond.models.C0.find(hero => hero.key === key).name} | ${models.filter(model => model.id !== 'C0').map(model => { const hero = diamond.models[model.id].find(hero => hero.key === key); return `${number(hero.score)} / ${hero.rank} / ${hero.tier}`; }).join(' | ')} |`);
lines.push('', '## 8개 조건 × 54명 = 432개 별도 산정 결과 (통계적 독립 표본이 아님)', '', '| 모델 | C0 대비 순위 변경 | 티어 변경 | 최대 순위 이동 | S 수 | 승률 50% 미만 S | 낮은 활용도 S | 자격 제한 적용 |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const row of summaries) lines.push(`| ${row.model} | ${row.changedRank}/${row.classified} | ${row.changedTier}/${row.classified} | ${row.maxShift} | ${row.sCount} | ${row.lowWinS} | ${row.lowUsageS} | ${row.caps} |`);
lines.push('', '낮은 활용도: 역할 내 픽률 백분위 <40 또는 원시 픽률 <1%. 이 기준은 연구용 정책이며 실제 표본 수나 신뢰도 기준이 아닙니다.', '', '## 표시 정밀도 민감도 (실제 시간 변화가 아닌 가정 실험)', '', '각 조건에서 요청한 10명 중 한 명의 승률만 ±0.1%p 바꿔 재산정했습니다. 160번의 결정적 실험이며 불확실성 추정·경기 수 생성이 아닙니다.', '', '| 모델 | 실험 수 | 해당 영웅 티어 변경 | 누군가 티어 변경한 실험 | 해당 영웅 최대 순위 이동 |', '| --- | --- | --- | --- | --- |');
for (const row of sensitivities) lines.push(`| ${row.model} | ${row.experiments} | ${row.changedTargetTiers} | ${row.changedAnyTiers} | ${row.maxRankShift} |`);
lines.push('', '## 조건별 전체 후보 표', '', '모든 수치는 아래 조건의 별도 API 응답에서 산정했으며 여러 등급을 평균하지 않았습니다. 더 자세한 원본·중간 백분위는 results.json과 candidate-comparison.csv에 있습니다.');
for (const cohort of results) {
  lines.push('', `### ${cohort.filters.region} / ${cohort.filters.division}`, '', '| 영웅 | C0 현재 | C1 | C2 | C3 | C4 | C5 |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const key of targetKeys) lines.push(`| ${cohort.models.C0.find(hero => hero.key === key).name} | ${models.map(model => { const hero = cohort.models[model.id].find(hero => hero.key === key); return `${number(hero.score)} / ${hero.rank} / ${hero.tier}`; }).join(' | ')} |`);
}
await fs.writeFile(new URL('COMPARISON.md', root), lines.join('\n') + '\n');
console.log(JSON.stringify({ summaries, sensitivities, checks: 'baseline matched current production code; C4 eligibility invariants and missing-data checks passed' }, null, 2));
