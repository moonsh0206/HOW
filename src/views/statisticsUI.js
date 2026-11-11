import {t} from '../i18n/i18n.js';
export const METRICS = [['tier', t("티어")], ['winRate', t("승률")], ['pickRate', t("픽률")], ['banRate', t("밴률")]];
import {rateStatus} from '../models/statisticsQuality.js';
export function metricValue(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return hero.statistics?.[field]!=null?t("message.758a1eda1679",{"0":(hero.statistics[field].toFixed(1))}):t("검토 중");
  return field === 'tier' ? hero.tier ?? t("미분류") : hero.statistics?.[field] == null ? t("미제공") : `${hero.statistics[field].toFixed(1)}%`;
}
export function metricClass(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return 'metric-review';
  return field === 'tier' && hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : field === 'tier' || hero.statistics?.[field] == null ? 'unavailable' : 'metric-value';
}
export function cacheLabel(statistics){return t("message.a36d104657ea",{"0":(statistics?.cached?t("브라우저 캐시 재사용"):t("브라우저 신규 조회")),"1":(statistics?.components?t("구성 등급별 상이"):Number.isFinite(statistics?.providerAgeSeconds)?t("message.e747de4794a8",{"0":(statistics.providerAgeSeconds)}):t("미제공"))});}
