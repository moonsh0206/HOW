export const METRICS = [['tier', '티어'], ['winRate', '승률'], ['pickRate', '픽률'], ['banRate', '밴률']];
export function metricValue(hero, field) {
  return field === 'tier' ? hero.tier ?? '미분류' : hero.statistics?.[field] == null ? '미제공' : `${hero.statistics[field].toFixed(1)}%`;
}
export function metricClass(hero, field) {
  return field === 'tier' && hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : field === 'tier' || hero.statistics?.[field] == null ? 'unavailable' : 'metric-value';
}
