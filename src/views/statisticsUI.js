export const METRICS = [['tier', '티어'], ['winRate', '승률'], ['pickRate', '픽률'], ['banRate', '밴률']];
import {rateStatus} from '../models/statisticsQuality.js';
export function metricValue(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return hero.statistics?.[field]!=null?`${hero.statistics[field].toFixed(1)}% · 검토 중`:'검토 중';
  return field === 'tier' ? hero.tier ?? '미분류' : hero.statistics?.[field] == null ? '미제공' : `${hero.statistics[field].toFixed(1)}%`;
}
export function metricClass(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return 'metric-review';
  return field === 'tier' && hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : field === 'tier' || hero.statistics?.[field] == null ? 'unavailable' : 'metric-value';
}
export function cacheLabel(statistics){return `${statistics?.cached?'브라우저 캐시 재사용':'브라우저 신규 조회'} · API 캐시 Age ${statistics?.components?'구성 등급별 상이':Number.isFinite(statistics?.providerAgeSeconds)?`${statistics.providerAgeSeconds}초`:'미제공'}`;}
