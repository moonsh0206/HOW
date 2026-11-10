import { ROLES } from '../models/heroModel.js';
import {syncCompactMain} from './compactMainView.js';
import { MODES, REGIONS, DIVISION_GROUPS, filterLabel,divisionName,isCompositeDivision,COMPOSITE_NOTICE } from '../models/statisticsModel.js';
import { METRICS, metricValue, metricClass } from './statisticsUI.js';
import { tierButton, showTierReason, closeTierHelp } from './tierReasonView.js';
import { MAP_KEYS,MAP_NAMES } from '../models/mapModel.js';
import {statisticsNeedsReview,qualitySummary} from '../models/statisticsQuality.js';
import {cacheLabel} from './statisticsUI.js';
import {createFilterCombobox} from './filterCombobox.js';
import {RANK_OPTIONS,mapDropdownOptions} from './filterOptions.js';
import {rankEmblem} from './rankEmblem.js';

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
  if (hero.metaScore != null) text.append(element('small', `META ${hero.metaScore.toFixed(1)}`, 'meta-hint'));
  if(hero.statistics?.missingDivisions?.length)text.append(element('small',`누락: ${hero.statistics.missingDivisions.map(divisionName).join(', ')}`,'meta-hint'));
  if(statisticsNeedsReview(hero.statistics))text.append(element('small',`통계 신뢰성 검토 중${hero.statistics.reviewDivisions?.length?` · ${hero.statistics.reviewDivisions.map(divisionName).join(', ')}`:''}`,'quality-note'));
  if (card) text.append(element('span', ROLES[hero.role], `role-tag ${hero.role}`));
  button.append(portrait(hero), text);
  button.setAttribute('aria-label', `${hero.name} 상세 페이지 보기`);
  return button;
}

// Both layouts consume the same filtered Model selection and event attributes.
function ordinalNode(tag, ordinal, label) {
  const number=element(tag,ordinal==null?'—':String(ordinal),'hero-ordinal');
  number.dataset.ordinal=ordinal==null?'':String(ordinal);
  number.title=ordinal==null?'미분류 · HOW 순번 미제공':label;
  number.setAttribute('aria-label',ordinal==null?'미분류 · 순번 미제공':`${label} ${ordinal}`);
  if(ordinal===1)number.classList.add('hero-ordinal-first');
  return number;
}
export function createHeroCard(hero, favorites, ordinal=null, ordinalLabel='현재 조회 조건 및 정렬 기준의 HOW 순번') {
  const card = element('li', undefined, 'hero-card');
  const header = element('div', undefined, 'hero-card-header');
  header.append(ordinalNode('span',ordinal,ordinalLabel),heroIdentity(hero, { card: true }), favoriteButton(hero, favorites));
  const stats = element('dl', undefined, 'hero-card-stats');
  for (const [field, label] of METRICS) {
    const metric = element('div');
    metric.append(element('dt', label), metricCell(hero, field));
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
  const basicCombos=[];
  for (const [id, choices] of [['#stats-mode', MODES], ['#stats-region', REGIONS]]) {
    const select = document.querySelector(id);
    for (const [value, label] of Object.entries(choices)) { const option = element('option', label); option.value = value; select.append(option); }
    basicCombos.push(createFilterCombobox(select,{options:Object.entries(choices).map(([value,label])=>({value,label}))}));
  }
  const divisions = document.querySelector('#stats-division');
  const mapSelect=document.querySelector('#stats-map');
  for(const [key,name] of [['all','전체 전장'],...[...MAP_KEYS].map(key=>[key,MAP_NAMES[key]])]){const option=element('option',name);option.value=key;mapSelect.append(option);}
  for (const group of DIVISION_GROUPS) {
    const optgroup = element('optgroup'); optgroup.label = group.label;
    for (const key of group.keys) { const option = element('option', divisionName(key)); option.value = key; optgroup.append(option); }
    divisions.append(optgroup);
  }
  const divisionCombo=createFilterCombobox(divisions,{options:RANK_OPTIONS,icon:rankEmblem});
  const mapCombo=createFilterCombobox(mapSelect,{options:mapDropdownOptions([...MAP_KEYS].map(key=>({key})))});
  const sortSelect=document.querySelector('#sort');
  const sortCombo=createFilterCombobox(sortSelect,{options:[...sortSelect.options].map(option=>({value:option.value,label:option.textContent}))});
  function renderDetailStatistics(hero, state) {
    let summary = document.querySelector('#detail-statistics');
    if (!summary) { summary = element('section'); summary.id = 'detail-statistics'; document.querySelector('#detail-content').append(summary); }
    summary.replaceChildren(element('h3', '실제 통계 · HOW 자체 티어'));
    const metrics = element('dl', undefined, 'hero-card-stats detail-metrics');
    for (const [field, label] of METRICS) { const group = element('div'); group.append(element('dt', label), element('dd', metricValue(hero, field), metricClass(hero, field))); metrics.append(group); }
    summary.append(metrics);
    if (state) summary.append(element('p', filterLabel(state.statsFilters)), element('p', state.statistics ? `${state.statistics.stale || state.statsStatus === 'error' ? '오래된 통계 · ' : ''}HOW 조회 ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 원본 집계 시각 미제공` : '이 조건의 통계가 없습니다.'));
  }
  return {
    setMaps(maps,selected='all') {
      mapSelect.replaceChildren();const all=element('option','전체 전장');all.value='all';mapSelect.append(all);
      for(const map of maps){const option=element('option',MAP_NAMES[map.key]);option.value=map.key;mapSelect.append(option);}
      if(selected!=='all'&&!maps.some(map=>map.key===selected)){const option=element('option',`${MAP_NAMES[selected]} · 목록 검토 중`);option.value=selected;mapSelect.append(option);}
      mapSelect.value=selected;
      mapCombo.setOptions(mapDropdownOptions(maps,selected));
    },
    render(model) {
      const { state } = model;
      const selection=model.listSelection();
      const heroes = selection.heroes;
      document.querySelector('#ordinal-heading').title=selection.label;
      document.querySelector('#ordinal-heading').setAttribute('aria-label',`순위 · ${selection.label}`);
      document.querySelector('#sort').value = state.sort;
      sortCombo.sync();
      document.querySelector('#list-title').firstChild.textContent = state.favoritesOnly ? '내 즐겨찾기' : '영웅 메타 티어';
      document.querySelector('#stats-mode').value = state.statsFilters.gamemode;
      document.querySelector('#stats-region').value = state.statsFilters.region;
      document.querySelector('#stats-division').value = state.statsFilters.division;
      document.querySelector('#stats-map').value = state.statsFilters.map;
      document.querySelector('#stats-division').disabled = state.statsFilters.gamemode !== 'competitive';
      const statsMessage = document.querySelector('#stats-status');
      const hasStats = state.statistics?.records.length > 0;
      const stale = state.statistics?.stale || state.statsStatus === 'error' && hasStats;
      document.querySelector('#active-cohort').textContent = `${filterLabel(state.statsFilters)}${state.statsFilters.map!=='all'?' · 선택 전장 기준':''}${state.metaPolicy?.version==='local-60-27-13'?' · 로컬 실험 모델':''}`;
      document.querySelector('#active-cohort-freshness').textContent = `출처: OverFast API · ${state.statsStatus === 'loading' ? '현재 조건 조회 중' : state.statistics ? `HOW 조회 ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}${stale ? ' · 오래된 통계' : ''}` : '현재 조건의 성공한 통계 조회 없음'} · 원본 집계 시각 미제공`;
      document.querySelector('#stats-division').title = state.statsFilters.gamemode === 'quickplay' ? '빠른 대전은 전체 등급으로 조회합니다.' : '개별 등급 또는 HOW 등급 균등 평균을 선택합니다. 그랜드마스터는 챔피언을 포함합니다.';
      basicCombos.forEach(combo=>combo.sync());divisionCombo.sync();mapCombo.sync();
      statsMessage.dataset.state = stale ? 'stale' : state.statsStatus;
      statsMessage.setAttribute('aria-description',isCompositeDivision(state.statsFilters.division)?COMPOSITE_NOTICE:'');
      statsMessage.textContent = state.statsStatus === 'loading' ? `통계 조회 중${hasStats ? ' · 이전 조회값을 표시합니다' : ' · 도착 전까지 미제공'}` : stale ? `오래된 통계 사용 중 · ${state.statsError}` : state.statsStatus === 'error' ? `통계 미제공 · ${state.statsError}` : state.statsStatus === 'empty' ? '이 조회 조건의 통계가 없습니다.' : state.statsStatus === 'ready' ? '실제 통계 연결 · 역할별 승률·픽률·밴률 메타 티어' : '통계 연결 대기 중';
      document.querySelector('[data-action="stats-refresh"]').disabled = state.statsStatus === 'loading';
      if(isCompositeDivision(state.statsFilters.division))statsMessage.textContent+=` · ${COMPOSITE_NOTICE}${state.statistics?.error?` · ${state.statistics.error}`:''}`;
      syncCompactMain();
      const quality=qualitySummary(state.statistics?.records??[]);if(quality.review)statsMessage.textContent+=` · 신뢰성 검토 ${quality.review}명 · 해당 영웅 티어 산정 보류`;
      document.querySelector('#stats-cohort').textContent = `통계 출처: OverFast API · ${filterLabel(state.statsFilters)}`;
      document.querySelector('#stats-timestamp').textContent = state.statistics ? `HOW 통계 조회: ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}${stale ? ' (오래됨)' : ''} · 최대 1시간 캐시` : 'HOW 통계 조회: 아직 성공한 조회 없음';
      if(state.statistics)document.querySelector('#stats-timestamp').textContent+=` · ${cacheLabel(state.statistics)} · 원본 집계 시각 미제공`;
      if (dialog.open && detailKey) { const current = model.heroByKey(detailKey); if (current) renderDetailStatistics(current, state); }
      document.querySelector('#result-count').textContent = state.status === 'ready' ? String(heroes.length).padStart(2, '0') : '—';
      document.querySelector('#favorite-count').textContent = state.favorites.size;
      for (const [id, current] of [['#nav-heroes', !state.favoritesOnly], ['#nav-favorites', state.favoritesOnly]]) {
        const link = document.querySelector(id);
        if(link.dataset.mainMenu)continue;
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
      document.querySelector('#updated-at').textContent = state.fetchedAt ? `영웅 정보 조회 ${new Date(state.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}` : '영웅 정보 조회 —';
      const fragment = document.createDocumentFragment();
      const cardFragment = document.createDocumentFragment();
      for (const hero of heroes) {
        const row = element('tr');
        const identity = element('td');
        identity.append(heroIdentity(hero));
        const role = element('td'); role.append(element('span', ROLES[hero.role], `role-tag ${hero.role}`));
        row.append(ordinalNode('td',selection.ordinals.get(hero.key),selection.label),identity, role);
        for (const [field, label] of METRICS) { const cell = element('td'); const value = metricValue(hero, field); cell.append(field === 'tier' ? tierButton(hero) : element('span', value, metricClass(hero, field))); cell.setAttribute('aria-label', `${label} ${value}`); row.append(cell); }
        const favoriteCell = element('td');
        favoriteCell.append(favoriteButton(hero, state.favorites)); row.append(favoriteCell); fragment.append(row);
        cardFragment.append(createHeroCard(hero, state.favorites,selection.ordinals.get(hero.key),selection.label));
      }
      const focused = document.activeElement;
      const active = rows.contains(focused) || cards.contains(focused) ? focused?.dataset.favorite : undefined;
      const focusRegion = focused?.closest('#hero-cards') ? cards : rows;
      const focusIndex = [...focusRegion.querySelectorAll('[data-favorite]')].indexOf(focused);
      rows.replaceChildren(fragment);
      cards.replaceChildren(cardFragment);
      if (active) {
        const remaining = [...focusRegion.querySelectorAll('[data-favorite]')];
        const target = remaining.find(button => button.dataset.favorite === active) ?? remaining[Math.min(focusIndex, remaining.length - 1)] ?? document.querySelector('#hero-search');
        target.focus({ preventScroll: true });
      }
      const preview = document.querySelector('#favorite-preview');
      const focusedPreview = preview.contains(document.activeElement) ? document.activeElement.dataset.hero : null;
      preview.replaceChildren();
      const favorites = model.enrichedHeroes().filter(hero => state.favorites.has(hero.key));
      for (const hero of favorites) {
        const button = element('button', undefined, 'preview-hero'); button.dataset.hero = hero.key;
        button.setAttribute('aria-label', `${hero.name} ${hero.tier ?? '미분류'} 상세 보기`);
        button.append(portrait(hero), element('span', hero.name), element('span', hero.tier ?? '미분류', hero.tier ? `favorite-tier tier-${hero.tier.toLowerCase()}` : 'favorite-tier unavailable')); preview.append(button);
      }
      if (!favorites.length) preview.append(element('p', state.status === 'loading' ? '목록을 불러오는 중입니다.' : '즐겨찾기한 영웅이 여기에 표시됩니다.', 'favorite-empty'));
      if (focusedPreview) [...preview.querySelectorAll('[data-hero]')].find(button => button.dataset.hero === focusedPreview)?.focus({ preventScroll: true });
    },
    showTierReason,
    closeTierReason: closeTierHelp,
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

function metricCell(hero, field) { const cell = element('dd'); cell.append(field === 'tier' ? tierButton(hero) : element('span', metricValue(hero, field), metricClass(hero, field))); return cell; }
