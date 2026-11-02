export const ROLES = Object.freeze({ tank: '돌격', damage: '공격', support: '지원' });

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

export function createHeroModel(favorites = []) {
  const state = { heroes: [], favorites: new Set(favorites), query: '', role: 'all', sort: 'name-asc', favoritesOnly: false, status: 'loading', error: '', fetchedAt: null };
  return {
    state,
    visibleHeroes() {
      const query = state.query.trim().normalize('NFKC').toLocaleLowerCase('ko');
      return state.heroes.filter(hero => (state.role === 'all' || hero.role === state.role) && (!state.favoritesOnly || state.favorites.has(hero.key)) && `${hero.name} ${hero.key}`.normalize('NFKC').toLocaleLowerCase('ko').includes(query))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko') * (state.sort === 'name-desc' ? -1 : 1));
    },
  };
}
