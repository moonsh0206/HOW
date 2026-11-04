import { roleTier } from './tier.js';
import {statisticsUsable} from '../models/statisticsQuality.js';

export const LEGACY_META_POLICY = Object.freeze({ version: 'meta-v1', weights: Object.freeze({ winRate: .7, pickRate: .3 }), lowPickRate: 1 });
export const META_POLICY = Object.freeze({ version: 'meta-v2', weights: Object.freeze({ winRate: .65, pickRate: .25, banRate: .10 }), lowPickRate: 1 });

// Average tied rank, scaled to [0,100]. A single member or all-equal cohort is neutral 50.
export function percentile(value, values) {
  if (!Number.isFinite(value) || !values.length || values.some(item => !Number.isFinite(item))) return null;
  if (values.length === 1) return 50;
  const lower = values.filter(item => item < value).length;
  const equal = values.filter(item => item === value).length;
  return (lower + (equal - 1) / 2) / (values.length - 1) * 100;
}
export function attachMetaTiersV1(heroes, records, policy = LEGACY_META_POLICY) {
  const { winRate: w, pickRate: p } = policy.weights;
  if (![w, p].every(value => Number.isFinite(value) && value >= 0) || Math.abs(w + p - 1) > 1e-9) throw new Error('Meta weights must be non-negative and sum to 1.');
  const byKey = new Map(records.map(record => [record.hero, record]));
  const joined = heroes.map(hero => ({ ...hero, statistics: byKey.get(hero.key) ?? null, tier: null, roleRank: null, metaScore: null, winPercentile: null, pickPercentile: null, lowPick: false }));
  for (const role of ['tank', 'damage', 'support']) {
    // Complete cases share the same reference cohort for both metrics; no reweighted missing data.
    const group = joined.filter(hero => hero.role === role && Number.isFinite(hero.statistics?.winRate) && Number.isFinite(hero.statistics?.pickRate));
    const wins = group.map(hero => hero.statistics.winRate), picks = group.map(hero => hero.statistics.pickRate);
    for (const hero of group) {
      hero.winPercentile = percentile(hero.statistics.winRate, wins);
      hero.pickPercentile = percentile(hero.statistics.pickRate, picks);
      hero.metaScore = Number((w * hero.winPercentile + p * hero.pickPercentile).toFixed(10));
      hero.lowPick = hero.statistics.pickRate < policy.lowPickRate;
    }
    group.sort((a, b) => b.metaScore - a.metaScore || a.key.localeCompare(b.key, 'en'));
    let rank = 0;
    group.forEach((hero, index) => {
      if (!index || hero.metaScore !== group[index - 1].metaScore) rank = index + 1;
      hero.roleRank = rank; hero.tier = roleTier(rank, group.length);
    });
  }
  return joined;
}

export const S_REQUIREMENTS = Object.freeze({ cohortSize: 5, winRate: 50, pickRate: 1, winPercentile: 60, pickPercentile: 40 });
export function sEligibility(hero, size) {
  const values = { cohortSize: size, winRate: hero.statistics?.winRate, pickRate: hero.statistics?.pickRate, winPercentile: hero.winPercentile, pickPercentile: hero.pickPercentile };
  return Object.entries(S_REQUIREMENTS).map(([field, minimum]) => ({ field, minimum, value: values[field] ?? null, passed: Number.isFinite(values[field]) && values[field] >= minimum }));
}

export function attachMetaTiers(heroes, records, policy = META_POLICY) {
  const fields = ['winRate', 'pickRate', 'banRate'];
  const weights = fields.map(field => policy.weights[field]);
  if (!weights.every(value => Number.isFinite(value) && value >= 0) || Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new Error('Meta weights must be non-negative and sum to 1.');
  const byKey = new Map(records.map(record => [record.hero, record]));
  const valid = value => Number.isFinite(value) && value >= 0 && value <= 100;
  const joined = heroes.map(hero => ({ ...hero, statistics: byKey.get(hero.key) ?? null, tier: null, provisionalTier: null, roleRank: null, roleSize: 0, metaScore: null, winPercentile: null, pickPercentile: null, banPercentile: null, eligibility: [], capped: false, lowPick: false }));
  for (const role of ['tank', 'damage', 'support']) {
    const group = joined.filter(hero => hero.role === role && statisticsUsable(hero.statistics) && fields.every(field => valid(hero.statistics?.[field])));
    for (const hero of group) {
      hero.roleSize = group.length;
      [hero.winPercentile, hero.pickPercentile, hero.banPercentile] = fields.map(field => percentile(hero.statistics[field], group.map(peer => peer.statistics[field])));
      hero.metaScore = Number(weights.reduce((score, weight, i) => score + weight * [hero.winPercentile, hero.pickPercentile, hero.banPercentile][i], 0).toFixed(10));
      hero.lowPick = hero.statistics.pickRate < policy.lowPickRate;
      hero.eligibility = sEligibility(hero, group.length);
    }
    group.sort((a, b) => b.metaScore - a.metaScore || a.key.localeCompare(b.key, 'en'));
    let rank = 0;
    group.forEach((hero, index) => {
      if (!index || hero.metaScore !== group[index - 1].metaScore) rank = index + 1;
      hero.roleRank = rank; hero.provisionalTier = roleTier(rank, group.length);
      hero.capped = hero.provisionalTier === 'S' && hero.eligibility.some(rule => !rule.passed);
      hero.tier = hero.capped ? 'A' : hero.provisionalTier;
    });
  }
  return joined;
}
