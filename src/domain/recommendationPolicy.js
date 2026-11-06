// Presentation eligibility layered over immutable v2 scores/ranks.
export const RECOMMENDATION_POLICY = Object.freeze({version:'meta-v2.1', sPickRate:5, conditionalPickRate:3});
export function applyRecommendationPolicy(hero) {
  const pick = hero.statistics?.pickRate;
  const restricted = hero.tier === 'S' && Number.isFinite(pick) && pick < RECOMMENDATION_POLICY.sPickRate;
  const tier = restricted ? 'A' : hero.tier;
  const recommendationGroup = tier === 'A' ? (pick >= RECOMMENDATION_POLICY.sPickRate ? 'a-standard' : pick >= RECOMMENDATION_POLICY.conditionalPickRate ? 'a-conditional' : 'a-low') : tier ?? 'unclassified';
  return {...hero, baselineTier:hero.tier, tier, recommendationGroup, recommendationCapped:restricted};
}
export function recommendationOrder(hero) {
  return ['S','a-standard','a-conditional','a-low','B','C','D','unclassified'].indexOf(hero.recommendationGroup ?? (hero.tier === 'A' ? applyRecommendationPolicy(hero).recommendationGroup : hero.tier ?? 'unclassified'));
}
export function recommendationLabel(hero) {
  return hero.recommendationGroup === 'a-conditional' ? '조건부' : hero.recommendationGroup === 'a-low' ? '저채용 · 검토' : '';
}
export function recommendationDescription(hero) {
  return hero.recommendationGroup === 'a-conditional' ? '조건부 A · 높은 성과를 보이지만 현재 픽률이 5% 미만인 전문화 영웅입니다.' : hero.recommendationGroup === 'a-low' ? '저채용 A · 현재 픽률이 3% 미만으로, A 티어를 유지하며 추가 검토 대상으로 표시합니다.' : '';
}
