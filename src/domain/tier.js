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
