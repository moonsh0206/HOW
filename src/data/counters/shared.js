export const official = key => `https://overwatch.blizzard.com/en-us/heroes/${key}/`;
export const cw = key => `https://www.counterwatch.gg/stats/overwatch/counters/${key}`;
export const cp = key => `https://counterpickgg.com/heroes/${key}`;
// Scores/ranks/win rates from third-party databases are deliberately not stored.
export function relation(heroKey, counterHeroKey, reason, options = {}) {
  const { counterType = 'ability', evidenceStatus = 'conditional', engagementType = 'direct', references = [], conflicts = [], statisticalDirection = 'supports' } = options;
  const sourceUrls = [...new Set([official(heroKey), official(counterHeroKey), ...references])];
  return {
    heroKey, counterHeroKey, counterType, reason, sourceUrls, evidenceStatus,
    statisticalEvidence: counterType === 'ability' ? null : { sourceUrl: references.find(url => url.startsWith('https://www.counterwatch.gg/')), metricType: 'counter-rating-index', direction: statisticalDirection, mode: '5v5', rank: 'all', queue: null, region: null, sourceUpdatedAt: '2026-11-02' },
    reviewedAt: '2026-11-03', applicablePatch: null, mode: '5v5',
    // Compatibility fields for the existing provider/View contract.
    relationType: 'counteredBy', gameMode: '5v5', sourceType: 'manual-review',
    sourceUrl: references[0] ?? official(counterHeroKey), abilitySources: [official(heroKey), official(counterHeroKey)],
    engagementType, status: evidenceStatus === 'conflicting' ? 'needs-review' : 'reviewed', conflicts,
  };
}
