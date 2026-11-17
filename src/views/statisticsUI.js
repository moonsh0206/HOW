import {t} from '../i18n/i18n.js';
export const METRICS = [['tier',()=>t('티어')],['winRate',()=>t('승률')],['pickRate',()=>t('픽률')],['banRate',()=>t('밴률')]].map(([field,translate])=>Object.defineProperty([field,''],1,{get:translate}));
import {rateStatus} from '../models/statisticsQuality.js';
export function formatPercentage(value,digits=1){return Number.isFinite(value)&&value>=0&&value<=100?`${value.toFixed(digits)}%`:t('미제공');}
export function formatPercentagePoints(value,digits=2){if(!Number.isFinite(value))return t('미제공');const rounded=Number(value.toFixed(digits));return `${rounded>0?'+':''}${rounded.toFixed(digits)}%p`;}
export function metricValue(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return Number.isFinite(hero.statistics?.[field])?t("message.758a1eda1679",{"0":(hero.statistics[field].toFixed(1))}):t("검토 중");
  return field === 'tier' ? hero.tier ?? t("미분류") : formatPercentage(hero.statistics?.[field]);
}
export function metricClass(hero, field) {
  if(field!=='tier'&&rateStatus(hero.statistics,field)==='review')return 'metric-review';
  return field === 'tier' && hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : field === 'tier' || hero.statistics?.[field] == null ? 'unavailable' : 'metric-value';
}
export function cacheLabel(statistics){return t("message.a36d104657ea",{"0":(statistics?.cached?t("브라우저 캐시 재사용"):t("브라우저 신규 조회")),"1":(statistics?.components?t("구성 등급별 상이"):Number.isFinite(statistics?.providerAgeSeconds)?t("message.e747de4794a8",{"0":(statistics.providerAgeSeconds)}):t("미제공"))});}
