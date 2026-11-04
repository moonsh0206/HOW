export const DEFAULT_FILTERS = Object.freeze({ platform: 'pc', gamemode: 'competitive', region: 'asia', division: 'diamond', map: 'all' });
// Historical collection stays explicitly all-rank; changing UI defaults must not relabel history.
export const ALL_RANK_FILTERS = Object.freeze({ ...DEFAULT_FILTERS, division: 'all' });
export const MODES = Object.freeze({ competitive: '경쟁전', quickplay: '빠른 대전' });
export const REGIONS = Object.freeze({ asia: '아시아', europe: '유럽', americas: '아메리카' });
export const DIVISIONS = Object.freeze({ all: '전체 등급', bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘', emerald: '에메랄드', diamond: '다이아몬드', master: '마스터', grandmaster: '그랜드마스터·챔피언' });
export const DIVISION_GROUPS = Object.freeze([
  Object.freeze({ label: '전체 등급', keys: Object.freeze(['all']) }),
  Object.freeze({ label: '일반 경쟁전', keys: Object.freeze(['bronze', 'silver', 'gold', 'platinum']) }),
  Object.freeze({ label: '중상위권', keys: Object.freeze(['emerald', 'diamond']) }),
  Object.freeze({ label: '최상위권', keys: Object.freeze(['master', 'grandmaster']) }),
]);

export function validateFilters(input = DEFAULT_FILTERS) {
  const filters = { ...DEFAULT_FILTERS, ...input };
  if (filters.platform !== 'pc' || !(filters.map === 'all' || MAP_KEYS.has(filters.map)) || !Object.hasOwn(MODES, filters.gamemode) || !Object.hasOwn(REGIONS, filters.region) || !Object.hasOwn(DIVISIONS, filters.division)) throw new Error('지원하지 않는 통계 조회 조건입니다.');
  if (filters.gamemode === 'quickplay' && filters.division !== 'all') throw new Error('빠른 대전에서는 경쟁전 등급을 지정할 수 없습니다.');
  return filters;
}
export function statisticsQuery(input) {
  const filters = validateFilters(input);
  const params = new URLSearchParams({ platform: filters.platform, gamemode: filters.gamemode, region: filters.region });
  if (filters.division !== 'all') params.set('competitive_division', filters.division);
  if (filters.map !== 'all') params.set('map', filters.map);
  return params.toString();
}
export function filterLabel(input) {
  const f = validateFilters(input);
  return `${REGIONS[f.region]} / PC / ${MODES[f.gamemode]} / ${DIVISIONS[f.division]} / ${f.map==='all'?'전체 전장':MAP_NAMES[f.map]}`;
}
export function normalizeStatistics(data) {
  if (!Array.isArray(data)) throw new Error('통계 응답이 목록 형식이 아닙니다.');
  const seen = new Set();
  const percent = value => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('통계 비율은 0~100 범위의 숫자여야 합니다.');
    return value;
  };
  return data.map(row => {
    if (!row || typeof row.hero !== 'string' || !/^[a-z0-9-]+$/.test(row.hero) || seen.has(row.hero)) throw new Error('통계 영웅 키가 잘못되었거나 중복되었습니다.');
    seen.add(row.hero);
    return Object.freeze({ hero: row.hero, winRate: percent(row.winrate), pickRate: percent(row.pickrate), banRate: percent(row.banrate) });
  });
}
import { MAP_KEYS, MAP_NAMES } from './mapModel.js';
