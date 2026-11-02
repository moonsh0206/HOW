import { ROLES } from '../models/heroModel.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function portrait(hero) {
  const frame = element('span', '', 'portrait');
  frame.textContent = hero.name.slice(0, 1);
  if (hero.portrait) {
    const image = element('img'); image.src = hero.portrait; image.alt = ''; image.loading = 'lazy';
    image.addEventListener('error', () => image.remove(), { once: true }); frame.append(image);
  }
  return frame;
}
export function createHeroView() {
  const rows = document.querySelector('#hero-rows');
  const dialog = document.querySelector('#hero-dialog');
  return {
    render(model) {
      const { state } = model;
      const heroes = model.visibleHeroes();
      document.querySelector('#list-title').firstChild.textContent = state.favoritesOnly ? '내 즐겨찾기' : '영웅 탐색';
      document.querySelector('#result-count').textContent = state.status === 'ready' ? String(heroes.length).padStart(2, '0') : '—';
      document.querySelector('#favorite-count').textContent = state.favorites.size;
      for (const [id, current] of [['#nav-heroes', !state.favoritesOnly], ['#nav-favorites', state.favoritesOnly]]) {
        const link = document.querySelector(id);
        if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      }
      document.querySelectorAll('[data-role]').forEach(button => button.setAttribute('aria-pressed', button.dataset.role === state.role));
      document.querySelector('#heroes').setAttribute('aria-busy', state.status === 'loading');
      const message = document.querySelector('#data-state');
      message.replaceChildren();
      if (state.status === 'loading') message.append(element('span', '', 'spinner'), element('h3', '영웅들을 불러오는 중'), element('p', 'OverFast API에서 영웅 정보를 가져오고 있습니다.'));
      else if (state.status === 'error') {
        message.append(element('h3', '잠시 연결이 끊겼어요'), element('p', state.error));
        const retry = element('button', '다시 시도', 'primary-button'); retry.dataset.action = 'retry'; message.append(retry);
      } else if (!heroes.length) message.append(element('h3', state.favoritesOnly && !state.favorites.size ? '첫 번째 영웅을 저장해 보세요' : '일치하는 영웅이 없습니다'), element('p', '검색어나 역할 필터를 바꾸거나 영웅 옆의 별을 눌러 보세요.'));
      message.hidden = state.status === 'ready' && heroes.length > 0;
      document.querySelector('#table-wrap').hidden = !message.hidden;
      document.querySelector('#result-summary').textContent = state.status === 'ready' ? `${heroes.length}명의 영웅 · 실제 통계 미제공` : state.status === 'loading' ? '영웅 정보 연결 중' : '영웅 정보를 가져오지 못했습니다';
      document.querySelector('#updated-at').textContent = state.fetchedAt ? `마지막 조회 ${new Date(state.fetchedAt).toLocaleString('ko-KR')}` : '마지막 조회 —';
      const fragment = document.createDocumentFragment();
      for (const hero of heroes) {
        const row = element('tr');
        const identity = element('td');
        const open = element('button', undefined, 'hero-identity'); open.dataset.hero = hero.key;
        const text = element('span'); text.append(element('strong', hero.name), element('small', hero.key.toUpperCase()));
        open.append(portrait(hero), text); open.setAttribute('aria-label', `${hero.name} 기본 정보 보기`); identity.append(open);
        const role = element('td'); role.append(element('span', ROLES[hero.role], `role-tag ${hero.role}`));
        row.append(identity, role);
        for (const label of ['티어', '승률', '픽률']) { const cell = element('td', '미제공', 'unavailable'); cell.setAttribute('aria-label', `${label} 미제공`); row.append(cell); }
        const favoriteCell = element('td');
        const favorite = element('button', state.favorites.has(hero.key) ? '★' : '☆', 'favorite-button'); favorite.dataset.favorite = hero.key;
        favorite.setAttribute('aria-pressed', state.favorites.has(hero.key)); favorite.setAttribute('aria-label', `${hero.name} 즐겨찾기`);
        favoriteCell.append(favorite); row.append(favoriteCell); fragment.append(row);
      }
      const active = document.activeElement?.dataset.favorite;
      rows.replaceChildren(fragment);
      if (active) rows.querySelector(`[data-favorite="${active}"]`)?.focus({ preventScroll: true });
      const preview = document.querySelector('#favorite-preview'); preview.replaceChildren();
      const favorites = state.heroes.filter(hero => state.favorites.has(hero.key));
      for (const hero of favorites.slice(0, 4)) {
        const button = element('button', undefined, 'preview-hero'); button.dataset.hero = hero.key; button.append(portrait(hero), element('span', hero.name), element('span', '↗')); preview.append(button);
      }
      if (!favorites.length) preview.append(element('p', state.status === 'loading' ? '목록을 불러오는 중입니다.' : '영웅 옆의 ☆을 눌러 저장하세요.', 'favorite-empty'));
    },
    showDetail(hero) {
      const content = document.querySelector('#detail-content'); content.replaceChildren(portrait(hero));
      const title = element('h2', hero.name); title.id = 'detail-name';
      content.append(title, element('span', ROLES[hero.role], `role-tag ${hero.role}`), element('p', hero.description || '현재 제공된 소개 정보가 없습니다.'));
      dialog.showModal();
    },
    closeDetail() { dialog.close(); },
    notify(message) { const notice = document.querySelector('#storage-notice'); notice.textContent = message; notice.hidden = false; },
  };
}
