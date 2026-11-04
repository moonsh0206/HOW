export const DEFAULT_FILTERS = Object.freeze({ platform: 'pc', gamemode: 'competitive', region: 'asia', division: 'diamond_plus', map: 'all' });
// Historical collection stays explicitly all-rank; changing UI defaults must not relabel history.
export const ALL_RANK_FILTERS = Object.freeze({ ...DEFAULT_FILTERS, division: 'all' });
export const MODES = Object.freeze({ competitive: '경쟁전', quickplay: '빠른 대전' });
export const REGIONS = Object.freeze({ asia: '아시아', europe: '유럽', americas: '아메리카' });
export const DIVISIONS = Object.freeze({ all: '전체 등급', bronze: '브론즈', silver: '실버', gold: '골드', platinum: '플래티넘', emerald: '에메랄드', diamond: '다이아몬드', master: '마스터', grandmaster: '그랜드마스터·챔피언' });
export const DIVISION_GROUPS = Object.freeze([
  Object.freeze({ label: '상위 누적 구간 · HOW 등급 균등 평균', keys: Object.freeze(['bronze_plus','silver_plus','gold_plus','platinum_plus','emerald_plus','diamond_plus','master_plus']) }),
  Object.freeze({ label: '전체 등급', keys: Object.freeze(['all']) }),
  Object.freeze({ label: '일반 경쟁전', keys: Object.freeze(['bronze', 'silver', 'gold', 'platinum']) }),
  Object.freeze({ label: '중상위권', keys: Object.freeze(['emerald', 'diamond']) }),
  Object.freeze({ label: '최상위권', keys: Object.freeze(['master', 'grandmaster']) }),
]);

export function validateFilters(input = DEFAULT_FILTERS) {
  const filters = { ...DEFAULT_FILTERS, ...input };
  if (filters.platform !== 'pc' || !(filters.map === 'all' || MAP_KEYS.has(filters.map)) || !Object.hasOwn(MODES, filters.gamemode) || !Object.hasOwn(REGIONS, filters.region) || !(Object.hasOwn(DIVISIONS, filters.division)||isCompositeDivision(filters.division))) throw new Error('지원하지 않는 통계 조회 조건입니다.');
  if (filters.gamemode === 'quickplay' && filters.division !== 'all') throw new Error('빠른 대전에서는 경쟁전 등급을 지정할 수 없습니다.');
  return filters;
}
export function statisticsQuery(input) {
  const filters = validateFilters(input);
  const params = new URLSearchParams({ platform: filters.platform, gamemode: filters.gamemode, region: filters.region });
  if (isCompositeDivision(filters.division)) params.set('how_division_group',filters.division);
  else if (filters.division !== 'all') params.set('competitive_division', filters.division);
  if (filters.map !== 'all') params.set('map', filters.map);
  return params.toString();
}
export function filterLabel(input) {
  const f = validateFilters(input);
  return `${REGIONS[f.region]} / PC / ${MODES[f.gamemode]} / ${divisionName(f.division)} / ${f.map==='all'?'전체 전장':MAP_NAMES[f.map]}`;
}
export function normalizeStatistics(data,{source='overfast'}={}) {
  if(!['overfast','blizzard'].includes(source))throw new Error('지원하지 않는 통계 원본입니다.');
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
    const fields={},rawValues={};
    const values=Object.fromEntries([['winRate','winrate'],['pickRate','pickrate'],['banRate','banrate']].map(([field,key])=>{
      const raw=row[key];
      if(source==='blizzard'&&raw===-1){fields[field]='confirmed-missing';rawValues[field]=-1;return [field,null];}
      const value=percent(raw);if(source==='blizzard'&&value===0)fields[field]='verified';return [field,value];
    }));
    if(source==='overfast'&&values.winRate===0&&values.pickRate!==null)fields.winRate='review';
    return Object.freeze({ hero: row.hero,...values,...(Object.keys(fields).length?{quality:Object.freeze({source,fields:Object.freeze(fields),rawValues:Object.freeze(rawValues)})}:{}) });
  });
}
import { MAP_KEYS, MAP_NAMES } from './mapModel.js';

export const RANK_ORDER=Object.freeze(['bronze','silver','gold','platinum','emerald','diamond','master','grandmaster']);
export const COMPOSITE_NOTICE='각 등급의 통계를 동일 비중으로 평균한 HOW 종합 지표입니다. 실제 경기 수를 반영한 공식 통합 통계와 다를 수 있습니다.';
export function isCompositeDivision(key){return typeof key==='string'&&key.endsWith('_plus')&&RANK_ORDER.slice(0,-1).includes(key.slice(0,-5));}
export function divisionMembers(key){if(isCompositeDivision(key))return RANK_ORDER.slice(RANK_ORDER.indexOf(key.slice(0,-5)));if(Object.hasOwn(DIVISIONS,key))return [key];throw new Error('지원하지 않는 등급입니다.');}
export function divisionName(key){return isCompositeDivision(key)?`${DIVISIONS[key.slice(0,-5)]} 이상`:DIVISIONS[key];}
