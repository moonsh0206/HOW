// Research only. Never imported by src. --fetch makes six sequential public API requests.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { attachMetaTiers, percentile } from '../src/domain/meta.js';
import { roleTier } from '../src/domain/tier.js';
import { normalizeHeroes } from '../src/models/heroModel.js';
import { normalizeStatistics, statisticsQuery } from '../src/models/statisticsModel.js';
const root = new URL('../docs/research/interactions/', import.meta.url);
await fs.mkdir(root, { recursive: true });
const conditions = [['asia', 'all'], ['asia', 'diamond'], ['asia', 'master'], ['asia', 'grandmaster'], ['americas', 'diamond'], ['europe', 'diamond']];
const targetKeys = ['genji', 'vendetta', 'venture', 'torbjorn', 'tracer', 'domina', 'winston', 'doomfist'];
if (process.argv.includes('--fetch')) {
  const evidence = { collectedAt: new Date().toISOString(), cases: [] };
  async function request(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    return { url, status: response.status, fetchedAt: new Date().toISOString(), age: response.headers.get('age'), cacheControl: response.headers.get('cache-control'), records: data };
  }
  evidence.heroes = await request('https://overfast-api.tekrop.fr/heroes?locale=ko-kr');
  if (evidence.heroes.status !== 200) throw new Error(`Heroes HTTP ${evidence.heroes.status}`);
  normalizeHeroes(evidence.heroes.records);
  for (const [region, division] of conditions) {
    const filters = { platform: 'pc', gamemode: 'competitive', region, division, map: 'all' };
    const api = await request(`https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(filters)}`);
    evidence.cases.push({ filters, api });
    console.log(`${region}/${division}: HTTP ${api.status}`);
    if (api.status !== 200) break; // No retries or hammering a rate-limited provider.
    normalizeStatistics(api.records);
  }
  await fs.writeFile(new URL('evidence.json', root), JSON.stringify(evidence, null, 2) + '\n');
}
const evidence = JSON.parse(await fs.readFile(new URL('evidence.json', root), 'utf8'));
const heroes = normalizeHeroes(evidence.heroes.records);
const candidates = [
  { id: 'A', formula: '100 × (.65W + .25P + .10B)', score: (w, p, b) => 100 * (.65 * w + .25 * p + .10 * b) },
  { id: 'B', formula: '100 × W × (.70 + .20P + .10B)', score: (w, p, b) => 100 * w * (.70 + .20 * p + .10 * b) },
  { id: 'C', formula: '100 × W × (.70 + .20√P + .10B)', score: (w, p, b) => 100 * w * (.70 + .20 * Math.sqrt(p) + .10 * b) },
  { id: 'D', formula: 'A score; S requires QW≥75, QP≥50 (other v2 gates unchanged)', score: (w, p, b) => 100 * (.65 * w + .25 * p + .10 * b), strict: true },
];
function evaluate(records, candidate) {
  const rows = attachMetaTiers(heroes, records);
  for (const h of rows) {
    if (h.metaScore == null) continue;
    h.metaScore = Number(candidate.score(h.winPercentile / 100, h.pickPercentile / 100, h.banPercentile / 100).toFixed(10));
    if (candidate.strict) h.eligibility = h.eligibility.map(r => r.field === 'winPercentile' || r.field === 'pickPercentile' ? { ...r, minimum: r.field === 'winPercentile' ? 75 : 50, passed: r.value >= (r.field === 'winPercentile' ? 75 : 50) } : r);
  }
  for (const role of ['tank', 'damage', 'support']) {
    const group = rows.filter(h => h.role === role && h.metaScore != null).sort((a, b) => b.metaScore - a.metaScore || a.key.localeCompare(b.key, 'en'));
    let rank = 0;
    group.forEach((h, i) => {
      if (!i || h.metaScore !== group[i - 1].metaScore) rank = i + 1;
      h.roleRank = rank; h.provisionalTier = roleTier(rank, group.length);
      h.capped = h.provisionalTier === 'S' && h.eligibility.some(r => !r.passed);
      h.tier = h.capped ? 'A' : h.provisionalTier;
    });
  }
  return rows;
}
const cohorts = evidence.cases.filter(c => c.api.status === 200).map(c => ({ ...c, records: normalizeStatistics(c.api.records) }));
assert.equal(cohorts.length, 6, 'Need all six successful cohorts, including four Asia ranks.');
const results = cohorts.map(c => ({ filters: c.filters, fetchedAt: c.api.fetchedAt, age: c.api.age, models: Object.fromEntries(candidates.map(model => [model.id, evaluate(c.records, model)])) }));
for (let i = 0; i < results.length; i++) assert.deepEqual(results[i].models.A, attachMetaTiers(heroes, cohorts[i].records));
const summarize = subset => candidates.map(({ id }) => {
  const distribution = { S: 0, A: 0, B: 0, C: 0, D: 0, unclassified: 0 };
  let rankChanges = 0, tierChanges = 0, maxRankShift = 0, caps = 0, lowWinProvisionalS = 0, lowWinFinalS = 0, lowUseProvisionalS = 0, lowUseFinalS = 0, highWinLowUseTop3 = 0;
  for (const c of subset) for (const h of c.models[id]) {
    const a = c.models.A.find(x => x.key === h.key);
    distribution[h.tier ?? 'unclassified']++; rankChanges += h.roleRank !== a.roleRank; tierChanges += h.tier !== a.tier; caps += h.capped;
    if (h.roleRank != null && a.roleRank != null) maxRankShift = Math.max(maxRankShift, Math.abs(h.roleRank - a.roleRank));
    const lowWin = h.statistics?.winRate < 50, lowUse = h.statistics?.pickRate < 1 || h.pickPercentile < 40;
    lowWinProvisionalS += h.provisionalTier === 'S' && lowWin; lowWinFinalS += h.tier === 'S' && lowWin;
    lowUseProvisionalS += h.provisionalTier === 'S' && lowUse; lowUseFinalS += h.tier === 'S' && lowUse;
    highWinLowUseTop3 += h.roleRank != null && h.roleRank <= 3 && h.winPercentile >= 75 && lowUse;
  }
  return { id, distribution, rankChanges, tierChanges, maxRankShift, caps, lowWinProvisionalS, lowWinFinalS, lowUseProvisionalS, lowUseFinalS, highWinLowUseTop3 };
});
const sensitivity = candidates.map(candidate => {
  let targetTierChanges = 0, maxRankShift = 0, experiments = 0;
  for (let i = 0; i < cohorts.length; i++) for (const key of targetKeys) for (const delta of [-.1, .1]) {
    const records = cohorts[i].records.map(r => r.hero === key ? { ...r, winRate: Number(Math.max(0, Math.min(100, r.winRate + delta)).toFixed(1)) } : r);
    const next = evaluate(records, candidate).find(h => h.key === key), old = results[i].models[candidate.id].find(h => h.key === key);
    if (!next || !old) continue;
    experiments++; targetTierChanges += next.tier !== old.tier; maxRankShift = Math.max(maxRankShift, Math.abs(next.roleRank - old.roleRank));
  }
  return { id: candidate.id, experiments, targetTierChanges, maxRankShift };
});
const summary = { all: summarize(results), asia: summarize(results.filter(c => c.filters.region === 'asia')), sensitivity };
function correlation(x, y) {
  const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length;
  const covariance = x.reduce((sum, value, i) => sum + (value - mx) * (y[i] - my), 0);
  const scale = Math.sqrt(x.reduce((sum, v) => sum + (v - mx) ** 2, 0) * y.reduce((sum, v) => sum + (v - my) ** 2, 0));
  return scale ? Number((covariance / scale).toFixed(4)) : null;
}
const anchor = results.find(c => c.filters.region === 'asia' && c.filters.division === 'diamond');
summary.crossCohorts = results.filter(c => c !== anchor).map(c => ({
  comparison: `asia/diamond vs ${c.filters.region}/${c.filters.division}`,
  roles: ['tank', 'damage', 'support'].map(role => ({ role, models: candidates.map(({ id }) => {
    const left = anchor.models[id].filter(h => h.role === role && h.metaScore != null);
    const right = c.models[id].filter(h => h.role === role && h.metaScore != null);
    const pairs = left.map(a => [a, right.find(b => b.key === a.key)]).filter(([, b]) => b);
    return { id, heroes: pairs.length, sameTier: pairs.filter(([a, b]) => a.tier === b.tier).length,
      spearman: correlation(pairs.map(([a]) => percentile(a.metaScore, left.map(h => h.metaScore))), pairs.map(([, b]) => percentile(b.metaScore, right.map(h => h.metaScore)))),
      maxRankShift: Math.max(...pairs.map(([a, b]) => Math.abs(a.roleRank - b.roleRank))) };
  }) }))
}));
// Fixed ablations, not additional fitted production policies. Same complete cohorts/gates.
const diagnosticCandidates = [
  { id: 'noBan', score: (w, p) => 100 * (.65 * w + .25 * p) / .9 },
  { id: 'pickPenalty', score: (w, p, b) => 100 * (.65 * w + .25 * p + .10 * b) * (.7 + .3 * Math.sqrt(p)) },
];
summary.diagnostics = diagnosticCandidates.map(candidate => {
  let ranks = 0, tiers = 0, caps = 0, lowUseTop3 = 0, lowWinS = 0;
  for (let i = 0; i < cohorts.length; i++) {
    const rows = evaluate(cohorts[i].records, candidate);
    for (const h of rows) {
      const a = results[i].models.A.find(x => x.key === h.key);
      ranks += h.roleRank !== a.roleRank; tiers += h.tier !== a.tier; caps += h.capped;
      lowUseTop3 += h.roleRank <= 3 && h.winPercentile >= 75 && (h.statistics?.pickRate < 1 || h.pickPercentile < 40);
      lowWinS += h.tier === 'S' && h.statistics?.winRate < 50;
    }
  }
  return { id: candidate.id, ranks, tiers, caps, highWinLowUseTop3: lowUseTop3, lowWinFinalS: lowWinS };
});
let md = '# Interaction model comparison — actual captured API data\n\n';
md += `Collection start UTC: ${evidence.collectedAt}. Individual fetch times/HTTP headers: evidence.json. Scores 0–100, percentile normalization within role and cohort. No sample-count estimates. A/B/C share v2 S eligibility; D changes gates only.\n\n`;
md += candidates.map(c => `${c.id}: ${c.formula}`).join('\n\n') + '\n\n';
md += '## Summary\n\n```json\n' + JSON.stringify(summary, null, 2) + '\n```\n';
for (const c of results) {
  md += `\n## ${c.filters.region}/${c.filters.division}\n\nHOW fetched: ${c.fetchedAt}, API Age: ${c.age ?? 'not supplied'}; not source aggregation time.\n\n`;
  md += '|Hero|Role|W/P/B (%)|Model|Score|Role rank|Provisional → final|S eligibility|Failed rules|\n|---|---|---|---|---:|---:|---|---|---|\n';
  for (const key of targetKeys) for (const { id } of candidates) {
    const h = c.models[id].find(h => h.key === key); if (!h) continue;
    md += `|${h.name}|${h.role}|${h.statistics ? [h.statistics.winRate, h.statistics.pickRate, h.statistics.banRate].join('/') : 'missing'}|${id}|${h.metaScore?.toFixed(2) ?? '—'}|${h.roleRank ?? '—'}|${h.provisionalTier ?? '—'} → ${h.tier ?? '—'}|${h.metaScore == null ? 'unclassified' : h.eligibility.every(r => r.passed) ? 'pass' : 'fail'}|${h.eligibility.filter(r => !r.passed).map(r => `${r.field} ${r.value?.toFixed(2)} < ${r.minimum}`).join('; ') || '—'}|\n`;
  }
  md += '\n|Model|S/A/B/C/D/unclassified|Capped heroes|\n|---|---|---|\n';
  for (const { id } of candidates) { const rows = c.models[id]; md += `|${id}|${['S', 'A', 'B', 'C', 'D', null].map(t => rows.filter(h => h.tier === t).length).join('/')}|${rows.filter(h => h.capped).map(h => h.key).join(', ') || 'none'}|\n`; }
}
const csv = ['region,division,model,hero,role,winrate,pickrate,banrate,score,rank,provisionalTier,tier,S_eligible,capped'];
for (const c of results) for (const { id } of candidates) for (const h of c.models[id]) csv.push([c.filters.region, c.filters.division, id, h.key, h.role, h.statistics?.winRate ?? '', h.statistics?.pickRate ?? '', h.statistics?.banRate ?? '', h.metaScore ?? '', h.roleRank ?? '', h.provisionalTier ?? '', h.tier ?? '', h.metaScore == null ? '' : h.eligibility.every(r => r.passed), h.capped].join(','));
await fs.writeFile(new URL('COMPARISON.md', root), md);
await fs.writeFile(new URL('results.json', root), JSON.stringify({ summary, results }, null, 2) + '\n');
await fs.writeFile(new URL('ranks.csv', root), csv.join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
