// No provider adapter is enabled until a public contract and reuse permission are verified.
export function unavailablePerkSelection(heroKey) {
  return {
    heroKey, status: 'unavailable', source: 'OverLooker', sourceUrl: 'https://overlooker.app/stats/perks',
    permission: 'unverified', mappingVersion: null, patch: null, window: null, filters: null,
    sample: { unit: 'perk-selections', minor: null, major: null }, fetchedAt: null, entries: [],
  };
}
/** Future authorized adapter output (not an assumed OverLooker response):
 * {heroKey, permissionReference, mappingVersion, patch, window:{start,end}, filters,
 *  sample:{unit:'perk-selections',minor,major}, fetchedAt,
 *  entries:[{providerPerkId,howPerkKey,tier:'minor'|'major',selectionCount,selectionRate}]}
 * Stable IDs, explicit tier denominators and versioned mappings are required; no name/order joins.
 */
