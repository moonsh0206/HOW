import { statisticsQuery, validateFilters } from '../models/statisticsModel.js';
import { attachMetaTiers } from './meta.js';
import {DEFAULT_META_POLICY} from './metaPolicies.js';
import {applyMetaRecommendation} from './metaV22Policy.js';

// Future comparison UI: independent rows, never a merged/averaged population.
export function compareHeroCohorts(key, heroes, cohorts, policy = DEFAULT_META_POLICY) {
  const seen = new Set();
  return cohorts.map(cohort => {
    if (!cohort.filters) throw new Error('Comparison cohort filters are required');
    const filters = validateFilters(cohort.filters), query = statisticsQuery(filters);
    if (seen.has(query)) throw new Error('Duplicate comparison cohort');
    seen.add(query);
    const hero = attachMetaTiers(heroes, cohort.records, policy).map(hero=>applyMetaRecommendation(hero,policy)).find(item => item.key === key);
    return { filters, query, fetchedAt: cohort.fetchedAt, hero: hero ?? null };
  });
}
