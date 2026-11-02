import { statisticsQuery, validateFilters } from '../models/statisticsModel.js';
import { attachMetaTiers, META_POLICY } from './meta.js';

// Future comparison UI: independent rows, never a merged/averaged population.
export function compareHeroCohorts(key, heroes, cohorts, policy = META_POLICY) {
  const seen = new Set();
  return cohorts.map(cohort => {
    if (!cohort.filters) throw new Error('Comparison cohort filters are required');
    const filters = validateFilters(cohort.filters), query = statisticsQuery(filters);
    if (seen.has(query)) throw new Error('Duplicate comparison cohort');
    seen.add(query);
    const hero = attachMetaTiers(heroes, cohort.records, policy).find(item => item.key === key);
    return { filters, query, fetchedAt: cohort.fetchedAt, hero: hero ?? null };
  });
}
