import { attachMetaTiers,META_POLICY } from '../domain/meta.js';
import {applyRecommendationPolicy,recommendationOrder} from '../domain/recommendationPolicy.js';
import { DEFAULT_FILTERS, statisticsQuery,isCompositeDivision,divisionMembers } from './statisticsModel.js';
export const ROLES = Object.freeze({ tank: '돌격', damage: '공격', support: '지원' });

// Ordinals describe this sorted cohort, never the API or a separate strength score.
export function buildListSelection(sorted, state) {
  const query=state.query.trim().normalize('NFKC').toLocaleLowerCase('ko');
  const alphabetical=state.sort.startsWith('name-');
  const label=alphabetical?'현재 이름 정렬의 표시 순서':'현재 조회 조건 및 정렬 기준의 HOW 순번';
  const ordinals=new Map(sorted.map((hero,index)=>[hero.key,alphabetical||hero.tier&&hero.metaScore!=null?index+1:null]));
  return {heroes:sorted.filter(hero=>(!state.favoritesOnly||state.favorites.has(hero.key))&&`${hero.name} ${hero.key}`.normalize('NFKC').toLocaleLowerCase('ko').includes(query)),ordinals,label};
}

export function safeImage(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

export function normalizeHeroes(data) {
  if (!Array.isArray(data)) throw new Error('영웅 목록의 응답 형식이 올바르지 않습니다.');
  const seen = new Set();
  return data.map(item => {
    if (!item || typeof item.key !== 'string' || !/^[a-z0-9-]+$/.test(item.key) || typeof item.name !== 'string' || !item.name.trim() || !Object.hasOwn(ROLES, item.role) || seen.has(item.key)) {
      throw new Error('영웅 데이터 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
    seen.add(item.key);
    return Object.freeze({ key: item.key, name: item.name.trim(), role: item.role, portrait: safeImage(item.portrait), description: typeof item.description === 'string' ? item.description : '', statistics: null });
  });
}

export function createHeroModel(favorites = [],{metaPolicy=META_POLICY}={}) {
  const state = { heroes: [], favorites: new Set(favorites), query: '', role: 'all', sort: 'tier-desc', favoritesOnly: false, status: 'loading', error: '', fetchedAt: null, statistics: null, statsStatus: 'idle', statsError: '', statsFilters: { ...DEFAULT_FILTERS }, previousSnapshot: null, snapshotStatus: 'idle', snapshotError: '' };
  state.metaPolicy=metaPolicy;
  const enriched = () => {
    // Production Service always supplies cohort metadata. Never score a different cohort.
    const matches = state.statistics?.filters && statisticsQuery(state.statistics.filters) === statisticsQuery(state.statsFilters);
    const records=matches?[...(state.statistics?.records??[])]:[];
    if(matches&&isCompositeDivision(state.statsFilters.division))for(const hero of state.heroes)if(!records.some(r=>r.hero===hero.key))records.push({hero:hero.key,winRate:null,pickRate:null,banRate:null,missingDivisions:divisionMembers(state.statsFilters.division)});
    return attachMetaTiers(state.heroes,records,metaPolicy).map(applyRecommendationPolicy);
  };
  return {
    state,
    enrichedHeroes: enriched,
    heroByKey(key) { return enriched().find(hero => hero.key === key); },
    visibleHeroes() { return this.listSelection().heroes; },
    listSelection() { return buildListSelection(this.sortedHeroes(),state); },
    sortedHeroes() {
      return enriched().filter(hero => state.role === 'all' || hero.role === state.role)
        .sort((a, b) => {
          if (state.sort === 'tier-desc') {
            const difference = recommendationOrder(a) - recommendationOrder(b);
            if (difference) return difference;
          }
          if (state.sort === 'meta-desc' || state.sort === 'tier-desc') {
            if (a.metaScore == null && b.metaScore != null) return 1;
            if (b.metaScore == null && a.metaScore != null) return -1;
            if (a.metaScore !== b.metaScore) return b.metaScore - a.metaScore;
          }
          const field = state.sort === 'winrate-desc' ? 'winRate' : state.sort === 'pickrate-desc' ? 'pickRate' : state.sort === 'banrate-desc' ? 'banRate' : null;
          if (field) {
            const av = a.statistics?.[field], bv = b.statistics?.[field];
            if (av != null || bv != null) {
              if (av == null) return 1;
              if (bv == null) return -1;
              if (av !== bv) return bv - av;
            }
          }
          return a.name.localeCompare(b.name, 'ko') * (state.sort === 'name-desc' ? -1 : 1) || a.key.localeCompare(b.key, 'en');
        });
    },
  };
}
