import { safeImage } from './heroModel.js';
import { COUNTER_HERO_KEYS } from '../data/counters/roster.js';
const known = new Set(COUNTER_HERO_KEYS);
const keyPattern = /^[a-z0-9-]+$/;
const https = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function normalizeCounters(raw) {
  if (!Array.isArray(raw)) throw new Error('카운터 데이터 형식 오류');
  const seen = new Set();
  return raw.map(row => {
    const id = `${row?.heroKey}:${row?.counterHeroKey}`;
    if (!row || typeof row.heroKey !== 'string' || typeof row.counterHeroKey !== 'string' || !keyPattern.test(row.heroKey) || !keyPattern.test(row.counterHeroKey) || row.heroKey === row.counterHeroKey || seen.has(id) || typeof row.reason !== 'string' || !row.reason.trim() || row.reason.length > 240 || typeof row.sourceUrl !== 'string' || !https(row.sourceUrl) || row.sourceType !== 'manual-review' || !date(row.reviewedAt) || !Array.isArray(row.abilitySources) || !row.abilitySources.every(https)) throw new Error('카운터 데이터 검증 실패');
    seen.add(id);
    if (row.counterType !== 'ability' && (!row.statisticalEvidence || !https(row.statisticalEvidence.sourceUrl) || row.statisticalEvidence.metricType !== 'counter-rating-index' || row.statisticalEvidence.mode !== '5v5' || !['supports', 'opposes', 'unverified'].includes(row.statisticalEvidence.direction))) throw new Error('상성 지표와 승률 구분 정보 누락');
    if (!known.has(row.heroKey) || !known.has(row.counterHeroKey) || !['ability', 'statistical', 'both'].includes(row.counterType) || !['confirmed', 'conditional', 'conflicting'].includes(row.evidenceStatus) || row.mode !== '5v5' || !Array.isArray(row.sourceUrls) || !row.sourceUrls.length || !row.sourceUrls.every(https) || (row.evidenceStatus === 'conflicting') !== (row.status === 'needs-review')) throw new Error('카운터 근거 스키마 오류');
    if (row.relationType !== 'counteredBy' || row.conflicts?.length && row.status !== 'needs-review') throw new Error('카운터 방향 또는 상충 상태 오류');
    if (row.gameMode !== '5v5' || !['reviewed', 'needs-review'].includes(row.status) || !['direct', 'team-utility', 'team-pressure'].includes(row.engagementType) || !(row.applicablePatch === null || typeof row.applicablePatch === 'string' && row.applicablePatch.trim()) || !Array.isArray(row.conflicts) || !row.conflicts.every(item => https(item?.sourceUrl) && typeof item.summary === 'string' && item.summary.trim()) || row.status === 'needs-review' && !row.conflicts.length) throw new Error('카운터 검토 메타데이터 오류');
    return Object.freeze({ heroKey: row.heroKey, counterHeroKey: row.counterHeroKey, counterType: row.counterType, sourceUrls: Object.freeze([...row.sourceUrls]), evidenceStatus: row.evidenceStatus, statisticalEvidence: row.statisticalEvidence ? Object.freeze({ ...row.statisticalEvidence }) : null, mode: row.mode, relationType: row.relationType, reason: row.reason.trim(), sourceUrl: row.sourceUrl, sourceType: row.sourceType, reviewedAt: row.reviewedAt, abilitySources: Object.freeze([...row.abilitySources]), gameMode: row.gameMode, applicablePatch: row.applicablePatch, status: row.status, engagementType: row.engagementType, conflicts: Object.freeze(row.conflicts.map(item => Object.freeze({ ...item }))) });
  });
}
export function selectCounters(records, heroKey, heroes) {
  const byKey = new Map((Array.isArray(heroes) ? heroes : []).filter(hero => hero && typeof hero.name === 'string' && hero.name.trim()).map(hero => [hero.key, hero]));
  const join = (row, key) => {
    const hero = byKey.get(key);
    return hero ? { ...row, targetHeroKey: row.heroKey, heroKey: key, name: hero.name, portrait: safeImage(hero.portrait) } : null;
  };
  return {
    heroKey,
    // One directed relation is indexed in both perspectives, never reversed as a new claim.
    counteredBy: records.filter(r => r.heroKey === heroKey && r.gameMode === '5v5').map(r => join(r, r.counterHeroKey)).filter(Boolean),
    counters: records.filter(r => r.counterHeroKey === heroKey && r.gameMode === '5v5').map(r => join(r, r.heroKey)).filter(Boolean),
    pendingCount: records.filter(r => r.heroKey === heroKey && r.status === 'needs-review').length,
  };
}
