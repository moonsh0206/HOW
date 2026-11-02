// Original plan: win rate in percent, playtime in one consistent unit.
// Natural logarithm is explicit here; unit/cohort/season must be agreed before production use.
export function calculateTierScore({ winRate, playTime } = {}) {
  if (!Number.isFinite(winRate) || winRate < 0 || winRate > 100 || !Number.isFinite(playTime) || playTime < 0) return null;
  return winRate * Math.log1p(playTime) / 100;
}

export function tierByPercent(rank, total) {
  if (!Number.isInteger(rank) || !Number.isInteger(total) || total < 1 || rank < 1 || rank > total) return null;
  const pct = rank / total * 100;
  return pct <= 15 ? 'S' : pct <= 30 ? 'A' : pct <= 50 ? 'B' : pct <= 75 ? 'C' : 'D';
}

// Cumulative ceil cutoffs; tied raw win rates share the best competition rank.
export function roleTier(rank, total) {
  if (!Number.isInteger(rank) || !Number.isInteger(total) || total < 1 || rank < 1 || rank > total) return null;
  for (const [tier, boundary] of [['S', 15], ['A', 30], ['B', 50], ['C', 75]]) if (rank <= Math.ceil(total * boundary / 100)) return tier;
  return 'D';
}
export function attachRoleTiers(heroes, records) {
  const byKey = new Map(records.map(record => [record.hero, record]));
  const joined = heroes.map(hero => ({ ...hero, statistics: byKey.get(hero.key) ?? null, tier: null, roleRank: null }));
  for (const role of ['tank', 'damage', 'support']) {
    const group = joined.filter(hero => hero.role === role && Number.isFinite(hero.statistics?.winRate))
      .sort((a, b) => b.statistics.winRate - a.statistics.winRate || a.key.localeCompare(b.key, 'en'));
    let rank = 0;
    group.forEach((hero, index) => {
      if (!index || hero.statistics.winRate !== group[index - 1].statistics.winRate) rank = index + 1;
      hero.roleRank = rank; hero.tier = roleTier(rank, group.length);
    });
  }
  return joined;
}
