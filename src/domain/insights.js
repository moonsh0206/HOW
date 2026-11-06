import { statisticsQuery } from '../models/statisticsModel.js';
import { percentile } from './meta.js';
import {statisticsNeedsReview,rateStatus} from '../models/statisticsQuality.js';
import {validatedProvenance,OBSERVATION_TOLERANCE_MS} from '../models/statisticsProvenance.js';
import {verifiedPatch} from '../models/patchHistoryModel.js';

export const INSIGHT_POLICY = Object.freeze({ minPickRate: 1, hotPickDelta: 1, minComparisonMs: 86400000, maxComparisonMs: 7 * 86400000, highWinPercentile: 75, maxPickPercentile: 50 });
export function hiddenGems(heroes, policy = INSIGHT_POLICY) {
  return heroes.filter(hero => {
    if (statisticsNeedsReview(hero.statistics)||!Number.isFinite(hero.statistics?.winRate) || !Number.isFinite(hero.statistics?.pickRate) || hero.statistics.pickRate < policy.minPickRate) return false;
    const peers = heroes.filter(other => !statisticsNeedsReview(other.statistics)&&other.role === hero.role && Number.isFinite(other.statistics?.winRate) && Number.isFinite(other.statistics?.pickRate));
    return peers.length >= 3 && percentile(hero.statistics.winRate, peers.map(item => item.statistics.winRate)) >= policy.highWinPercentile && percentile(hero.statistics.pickRate, peers.map(item => item.statistics.pickRate)) <= policy.maxPickPercentile;
  }).sort((a, b) => b.statistics.winRate - a.statistics.winRate || a.key.localeCompare(b.key, 'en')).slice(0, 3);
}
export function classifyMeta(heroes) {
  function leaders(field) {
    return ['tank', 'damage', 'support'].flatMap(role => {
      const candidates = heroes.filter(hero => hero.role === role && Number.isFinite(hero.statistics?.[field]) && hero.statistics[field] > 0)
        .sort((a, b) => b.statistics[field] - a.statistics[field] || a.key.localeCompare(b.key, 'en'));
      return candidates.slice(0, 1);
    });
  }
  return { highWinRate: leaders('winRate'), popularPicks: leaders('pickRate'), contestedPicks: leaders('banRate'), hiddenPicks: hiddenGems(heroes) };
}
export function hotHeroes(heroes, current, previous, policy = INSIGHT_POLICY) {
  if (!current || !previous) return { available: false, reason: '해당 등급의 이전 관측 데이터 부족', heroes: [] };
  const currentOrigin=validatedProvenance(current),previousOrigin=validatedProvenance(previous);
  if(current.stale||!currentOrigin||!previousOrigin||currentOrigin.kind!==previousOrigin.kind||currentOrigin.version!==previousOrigin.version||!Array.isArray(previous.records))return {available:false,reason:'출처 또는 파생 계산 정책을 확인할 수 없어 비교를 보류합니다.',heroes:[]};
  try { if (statisticsQuery(current.filters) !== statisticsQuery(previous.filters)) return { available: false, reason: '비교 조건이 다릅니다.', heroes: [] }; }
  catch { return { available: false, reason: '비교 조건을 확인할 수 없습니다.', heroes: [] }; }
  const a=verifiedPatch(current),b=verifiedPatch(previous);
  const windowA=current.statisticsWindow??'unverified-patch-window',windowB=previous.statisticsWindow??'unverified-patch-window';
  if(Boolean(a)!==Boolean(b)||a&&a.id!==b.id||windowA!==windowB||!a&&windowA==='since-patch-start'||current.patch!==previous.patch&&(current.patch||previous.patch))return {available:false,reason:'패치 또는 통계 집계 기간이 달라 HOT 비교를 보류합니다.',heroes:[]};
  if(currentOrigin.kind==='derived'&&[current,previous].some(s=>s.observationStart&&(!Number.isFinite(Date.parse(s.observationStart))||Date.parse(s.fetchedAt??s.collectedAt)-Date.parse(s.observationStart)>OBSERVATION_TOLERANCE_MS)))return {available:false,reason:'구성 등급 관측 시각 차이가 커 비교를 보류합니다.',heroes:[]};
  const elapsed = Date.parse(current.fetchedAt) - Date.parse(previous.collectedAt);
  if (!Number.isFinite(elapsed) || elapsed < policy.minComparisonMs || elapsed > policy.maxComparisonMs) return { available: false, reason: '비교 간격은 1일 이상, 7일 이내여야 합니다.', heroes: [] };
  const before = new Map(previous.records.map(record => [record.hero, record]));
  const selected = [];
  for (const hero of heroes) {
    const old = before.get(hero.key), now = hero.statistics;
    if(statisticsNeedsReview(old)||statisticsNeedsReview(now))continue;
    if(['winRate','pickRate'].some(f=>rateStatus(old,f)!=='available'||rateStatus(now,f)!=='available'))continue;
    if (![old?.winRate, old?.pickRate, now?.winRate, now?.pickRate].every(Number.isFinite)) continue;
    const pickDelta = now.pickRate - old.pickRate, winDelta = now.winRate - old.winRate;
    if (pickDelta >= policy.hotPickDelta && winDelta >= 0 && now.pickRate >= policy.minPickRate) selected.push({ ...hero, pickDelta, winDelta });
  }
  selected.sort((a, b) => b.pickDelta - a.pickDelta || b.winDelta - a.winDelta || a.key.localeCompare(b.key, 'en'));
  return { available: true, reason: 'HOW 수집 시점 간 비교 · 패치 변화 또는 인과관계를 뜻하지 않습니다.',warning:a?'':'패치 집계창 미확인 · 일반 관측값 비교이며 패치 효과를 뜻하지 않습니다.', heroes: selected.slice(0, 3), previousAt: previous.collectedAt, currentAt: current.fetchedAt };
}
