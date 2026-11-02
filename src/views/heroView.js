import { ROLES } from '../models/heroModel.js';
import { MODES, REGIONS, DIVISIONS, filterLabel } from '../models/statisticsModel.js';

const METRICS = [['tier', '티어'], ['winRate', '승률'], ['pickRate', '픽률'], ['banRate', '밴률']];
function metricValue(hero, field) {
  return field === 'tier' ? hero.tier ?? '미분류' : hero.statistics?.[field] == null ? '미제공' : `${hero.statistics[field].toFixed(1)}%`;
}
function metricClass(hero, field) {
  return field === 'tier' && hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : field === 'tier' || hero.statistics?.[field] == null ? 'unavailable' : 'metric-value';
}

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
function favoriteButton(hero, favorites) {
  const selected = favorites.has(hero.key);
  const button = element('button', selected ? '★' : '☆', 'favorite-button');
  button.dataset.favorite = hero.key;
  button.setAttribute('aria-pressed', selected);
  button.setAttribute('aria-label', `${hero.name} 즐겨찾기`);
  return button;
}
function heroIdentity(hero, { card = false } = {}) {
  const button = element('button', undefined, 'hero-identity');
  button.dataset.hero = hero.key;
  const text = element('span', undefined, 'hero-name');
  text.append(element('strong', hero.name), element('small', hero.key.toUpperCase()));
  if (card) text.append(element('span', ROLES[hero.role], `role-tag ${hero.role}`));
  button.append(portrait(hero), text);
  button.setAttribute('aria-label', `${hero.name} 기본 정보 보기`);
  return button;
}

// Both layouts consume the same filtered Model selection and event attributes.
export function createHeroCard(hero, favorites) {
  const card = element('li', undefined, 'hero-card');
  const header = element('div', undefined, 'hero-card-header');
  header.append(heroIdentity(hero, { card: true }), favoriteButton(hero, favorites));
  const stats = element('dl', undefined, 'hero-card-stats');
  for (const [field, label] of METRICS) {
    const metric = element('div');
    metric.append(element('dt', label), element('dd', metricValue(hero, field), metricClass(hero, field)));
    stats.append(metric);
  }
  card.append(header, stats);
  return card;
}
export function createHeroView() {
  const rows = document.querySelector('#hero-rows');
  const cards = document.querySelector('#hero-cards');
  const dialog = document.querySelector('#hero-dialog');
  let detailKey;
  dialog.addEventListener('close', () => document.documentElement.classList.remove('detail-open'));
  for (const [id, choices] of [['#stats-mode', MODES], ['#stats-region', REGIONS], ['#stats-division', DIVISIONS]]) {
    const select = document.querySelector(id);
    for (const [value, label] of Object.entries(choices)) { const option = element('option', label); option.value = value; select.append(option); }
  }
  function renderDetailStatistics(hero, state) {
    let summary = document.querySelector('#detail-statistics');
    if (!summary) { summary = element('section'); summary.id = 'detail-statistics'; document.querySelector('#detail-content').append(summary); }
    summary.replaceChildren(element('h3', '실제 통계 · HOW 자체 티어'));
    const metrics = element('dl', undefined, 'hero-card-stats detail-metrics');
    for (const [field, label] of METRICS) { const group = element('div'); group.append(element('dt', label), element('dd', metricValue(hero, field), metricClass(hero, field))); metrics.append(group); }
    summary.append(metrics);
    if (state) summary.append(element('p', filterLabel(state.statsFilters)), element('p', state.statistics ? `${state.statistics.stale || state.statsStatus === 'error' ? '오래된 통계 · ' : ''}HOW 조회 ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR')} · 원본 집계 시각 미제공` : '이 조건의 통계가 없습니다.'));
  }
  return {
    render(model) {
      const { state } = model;
      const heroes = model.visibleHeroes();
      document.querySelector('#list-title').firstChild.textContent = state.favoritesOnly ? '내 즐겨찾기' : '영웅 티어리스트';
      document.querySelector('#stats-mode').value = state.statsFilters.gamemode;
      document.querySelector('#stats-region').value = state.statsFilters.region;
      document.querySelector('#stats-division').value = state.statsFilters.division;
      document.querySelector('#stats-division').disabled = state.statsFilters.gamemode !== 'competitive';
      const statsMessage = document.querySelector('#stats-status');
      const hasStats = state.statistics?.records.length > 0;
      const stale = state.statistics?.stale || state.statsStatus === 'error' && hasStats;
      statsMessage.dataset.state = stale ? 'stale' : state.statsStatus;
      statsMessage.textContent = state.statsStatus === 'loading' ? `통계 조회 중${hasStats ? ' · 이전 조회값을 표시합니다' : ' · 도착 전까지 미제공'}` : stale ? `오래된 통계 사용 중 · ${state.statsError}` : state.statsStatus === 'error' ? `통계 미제공 · ${state.statsError}` : state.statsStatus === 'empty' ? '이 조회 조건의 통계가 없습니다.' : state.statsStatus === 'ready' ? '실제 통계 연결 · 역할 내 승률 기준 HOW 자체 티어' : '통계 연결 대기 중';
      document.querySelector('[data-action="stats-refresh"]').disabled = state.statsStatus === 'loading';
      document.querySelector('#stats-cohort').textContent = `통계 출처: OverFast API · ${filterLabel(state.statsFilters)}`;
      document.querySelector('#stats-timestamp').textContent = state.statistics ? `HOW 통계 조회: ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR')}${stale ? ' (오래됨)' : ''} · 최대 1시간 캐시` : 'HOW 통계 조회: 아직 성공한 조회 없음';
      if (dialog.open && detailKey) { const current = model.heroByKey(detailKey); if (current) renderDetailStatistics(current, state); }
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
      document.querySelector('#result-summary').textContent = state.status === 'ready' ? `${heroes.length}명의 영웅 · ${heroes.filter(hero => hero.tier).length}명 티어 분류` : state.status === 'loading' ? '영웅 정보 연결 중' : '영웅 정보를 가져오지 못했습니다';
      document.querySelector('#updated-at').textContent = state.fetchedAt ? `영웅 정보 조회 ${new Date(state.fetchedAt).toLocaleString('ko-KR')}` : '영웅 정보 조회 —';
      const fragment = document.createDocumentFragment();
      const cardFragment = document.createDocumentFragment();
      for (const hero of heroes) {
        const row = element('tr');
        const identity = element('td');
        identity.append(heroIdentity(hero));
        const role = element('td'); role.append(element('span', ROLES[hero.role], `role-tag ${hero.role}`));
        row.append(identity, role);
        for (const [field, label] of METRICS) { const cell = element('td'); const value = metricValue(hero, field); cell.append(element('span', value, metricClass(hero, field))); cell.setAttribute('aria-label', `${label} ${value}`); row.append(cell); }
        const favoriteCell = element('td');
        favoriteCell.append(favoriteButton(hero, state.favorites)); row.append(favoriteCell); fragment.append(row);
        cardFragment.append(createHeroCard(hero, state.favorites));
      }
      const focused = document.activeElement;
      const active = focused?.dataset.favorite;
      const focusRegion = focused?.closest('#hero-cards') ? cards : rows;
      const focusIndex = [...focusRegion.querySelectorAll('[data-favorite]')].indexOf(focused);
      rows.replaceChildren(fragment);
      cards.replaceChildren(cardFragment);
      if (active) {
        const remaining = [...focusRegion.querySelectorAll('[data-favorite]')];
        const target = remaining.find(button => button.dataset.favorite === active) ?? remaining[Math.min(focusIndex, remaining.length - 1)] ?? document.querySelector('#hero-search');
        target.focus({ preventScroll: true });
      }
      const preview = document.querySelector('#favorite-preview'); preview.replaceChildren();
      const favorites = state.heroes.filter(hero => state.favorites.has(hero.key));
      for (const hero of favorites.slice(0, 4)) {
        const button = element('button', undefined, 'preview-hero'); button.dataset.hero = hero.key; button.append(portrait(hero), element('span', hero.name), element('span', '↗')); preview.append(button);
      }
      if (!favorites.length) preview.append(element('p', state.status === 'loading' ? '목록을 불러오는 중입니다.' : '영웅 옆의 ☆을 눌러 저장하세요.', 'favorite-empty'));
    },
    showDetail(hero, state) {
      detailKey = hero.key;
      const content = document.querySelector('#detail-content'); content.replaceChildren(portrait(hero));
      const title = element('h2', hero.name); title.id = 'detail-name';
      content.append(title, element('span', ROLES[hero.role], `role-tag ${hero.role}`), element('p', hero.description || '현재 제공된 소개 정보가 없습니다.'));
      renderDetailStatistics(hero, state);
      dialog.showModal();
      document.documentElement.classList.add('detail-open');
    },
    closeDetail() { dialog.close(); },
    notify(message) { const notice = document.querySelector('#storage-notice'); notice.textContent = message; notice.hidden = false; },
  };
}
