import { tierButton } from './tierReasonView.js';
import { renderCounters } from './counterView.js';
import { renderPickHistory } from './pickHistoryView.js';
import { withCurrentPickHistory } from '../models/pickHistoryModel.js';
import { unavailablePerkSelection } from '../models/perkSelectionModel.js';
import { node, image } from './dom.js';
import { METRICS, metricValue, metricClass } from './statisticsUI.js';
import { ROLES } from '../models/heroModel.js';
import { filterLabel } from '../models/statisticsModel.js';

function itemCard(item) {
  const card = node('article', undefined, 'ability-card'); const header = node('div', undefined, 'ability-heading');
  if (item.icon) header.append(image(item.icon));
  header.append(node('h3', item.name)); card.append(header, node('p', item.description));
  if (item.video?.mp4 || item.video?.webm) {
    const disclosure = node('details', undefined, 'ability-video'); disclosure.append(node('summary', '시연 영상 보기'));
    const video = node('video'); video.controls = true; video.preload = 'none'; video.playsInline = true;
    video.setAttribute('aria-label', `${item.name} 시연 영상`);
    if (item.video.thumbnail) video.poster = item.video.thumbnail;
    for (const type of ['webm', 'mp4']) if (item.video[type]) { const source = node('source'); source.src = item.video[type]; source.type = `video/${type}`; video.append(source); }
    disclosure.append(video); card.append(disclosure);
  }
  return card;
}
export function createHeroDetailView() {
  const root = document.querySelector('#hero-detail-page');
  let contentKey;
  function section(id, title, items) {
    const wrapper = node('section', undefined, 'detail-section'); wrapper.id = id;
    wrapper.append(node('h2', title)); const grid = node('div', undefined, 'ability-grid');
    for (const item of items) grid.append(itemCard(item));
    wrapper.append(items.length ? grid : node('p', '현재 API에서 제공된 정보가 없습니다.', 'empty-note'));
    return wrapper;
  }
  return {
    render(detailState, model, route, counters = { status: 'empty', counteredBy: [] }, history = { status: 'idle', days: 7 }) {
      const { state } = model;
      const signature = `${route.key}:${detailState.status}:${detailState.result?.fetchedAt ?? ''}`;
      if (signature !== contentKey) {
        contentKey = signature; root.replaceChildren();
        const back = node('a', '← 영웅 목록으로 돌아가기', 'detail-back'); back.href = state.favoritesOnly ? '#favorites' : '#heroes'; root.append(back);
        if (detailState.status !== 'ready') {
          const message = node('div', undefined, 'data-state'); message.setAttribute('role', 'status');
          message.append(node('h1', detailState.status === 'loading' ? '영웅 정보를 불러오는 중' : '영웅 정보를 표시할 수 없습니다'), node('p', detailState.error || 'OverFast API에서 기술과 특전을 확인하고 있습니다.'));
          if (detailState.status === 'error') { const retry = node('button', '다시 시도', 'primary-button'); retry.dataset.action = 'detail-retry'; message.append(retry); }
          root.append(message); return;
        }
        const hero = detailState.result.detail;
        const header = node('header', undefined, 'detail-hero');
        if (hero.backgrounds.length) {
          const picture = node('picture', undefined, 'detail-background');
          for (const [size, media] of [['sm', '(max-width: 600px)'], ['lg', '(max-width: 1400px)']]) {
            const background = hero.backgrounds.find(item => item.sizes.includes(size));
            if (background) { const source = node('source'); source.media = media; source.srcset = background.url; picture.append(source); }
          }
          const fallback = hero.backgrounds.find(item => item.sizes.includes('xl+')) ?? hero.backgrounds[0]; picture.append(image(fallback.url)); header.append(picture);
        }
        const identity = node('div', undefined, 'detail-identity');
        if (hero.portrait) identity.append(image(hero.portrait, 'detail-portrait'));
        const title = node('div'); title.append(node('p', 'HERO INTELLIGENCE', 'eyebrow'));
        const h1 = node('h1', hero.name); h1.tabIndex = -1; title.append(h1, node('span', ROLES[hero.role], `role-tag ${hero.role}`));
        identity.append(title); header.append(identity, node('p', hero.description, 'detail-description')); root.append(header);
        const stats = node('section'); stats.id = 'detail-page-statistics'; stats.setAttribute('aria-label', '영웅 통계 요약'); root.append(stats);
        const tabs = node('nav', undefined, 'detail-tabs'); tabs.setAttribute('aria-label', '영웅 상세 섹션');
        for (const [tab, label] of [['overview', '전체 정보'], ['abilities', '기술·패시브'], ['perks', '특전']]) { const link = node('a', label); link.href = `#/heroes/${hero.key}${tab === 'overview' ? '' : '/' + tab}`; link.dataset.detailTab = tab; tabs.append(link); }
        root.append(tabs, section('detail-abilities', '영웅 기술', hero.abilities));
        const passive = section('detail-passives', '패시브 기술', []);
        passive.querySelector('p').textContent = 'API가 패시브 구분 필드를 제공하지 않아 별도 분류하지 않습니다. 위 기술 목록에서 확인하세요.'; root.append(passive);
        root.append(section('detail-minor', '일반 특전 · Minor', hero.minor), section('detail-major', '주요 특전 · Major', hero.major));
        const rates = section('detail-perk-rates', '특전 선택률', []);
        const perkRates = unavailablePerkSelection(hero.key);
        rates.querySelector('p').textContent = '선택률 미제공 · 재사용 가능한 데이터 연결 준비 중입니다.';
        const rateSource = node('a', '선택률 제공처 검토: OverLooker ↗', 'counter-source'); rateSource.href = perkRates.sourceUrl; rateSource.target = '_blank'; rateSource.rel = 'noreferrer'; rates.append(rateSource); root.append(rates);
        const source = node('p', `기술·특전 출처: OverFast API · HOW 상세 조회 ${new Date(detailState.result.fetchedAt).toLocaleString('ko-KR')}`, 'detail-source'); root.append(source);
      }
      if (detailState.status !== 'ready') return;
      const hero = model.heroByKey(route.key) ?? { ...detailState.result.detail, tier: null, statistics: null, metaScore: null };
      const stats = root.querySelector('#detail-page-statistics');
      const summary = node('div', undefined, 'detail-summary');
      const metrics = node('dl', undefined, 'detail-metrics');
      for (const [field, label] of METRICS) { const group = node('div'); const value = node('dd'); value.append(field === 'tier' ? tierButton(hero) : node('span', metricValue(hero, field), metricClass(hero, field))); group.append(node('dt', label), value); metrics.append(group); }
      const summaryTop = node('div', undefined, 'detail-summary-top');
      const information = node('div', undefined, 'detail-summary-info');
      const side = node('div', undefined, 'detail-summary-side');
      summaryTop.append(metrics, side, information); summary.append(summaryTop);
      information.append(node('p', `HOW 메타 점수 ${hero.metaScore == null ? '미분류' : hero.metaScore.toFixed(1)} / 100`));
      const button = node('button', state.favorites.has(route.key) ? '★ 즐겨찾기 저장됨' : '☆ 즐겨찾기', 'detail-favorite'); button.dataset.favorite = route.key; button.setAttribute('aria-pressed', state.favorites.has(route.key)); information.append(button);
      information.append(node('p', filterLabel(state.statsFilters)), node('p', `통계: OverFast API · ${state.statsStatus === 'loading' ? '조회 중 · ' : ''}${state.statistics ? `HOW 조회 ${new Date(state.statistics.fetchedAt).toLocaleString('ko-KR')}` : '현재 조건 통계 미제공'}${state.statistics?.stale || state.statsStatus === 'error' ? ' · 갱신 실패/오래된 통계' : ''}`));
      const filtersLink = node('a', '영웅 목록으로 →', 'text-link'); filtersLink.href = '#heroes'; information.append(filtersLink);
      const focused = document.activeElement === stats.querySelector('[data-favorite]');
      const oldHistory = stats.querySelector('.pick-history');
      const historyFocus = oldHistory?.contains(document.activeElement) ? document.activeElement.dataset.historyDays : null;
      const recordsOpen = oldHistory?.querySelector('.history-records')?.open;
      const chart = renderPickHistory(withCurrentPickHistory(history, state.statistics, route.key, state.statsFilters), state.statsFilters);
      if (recordsOpen && chart.querySelector('.history-records')) chart.querySelector('.history-records').open = true;
      side.append(renderCounters(counters), chart);
      stats.replaceChildren(summary); if (focused) button.focus({ preventScroll: true });
      if (historyFocus) chart.querySelector(`[data-history-days="${historyFocus}"]`)?.focus({ preventScroll: true });
      for (const link of root.querySelectorAll('[data-detail-tab]')) { if (link.dataset.detailTab === route.tab) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
      for (const id of ['detail-abilities', 'detail-passives']) root.querySelector('#' + id).hidden = route.tab === 'perks';
      for (const id of ['detail-minor', 'detail-major', 'detail-perk-rates']) root.querySelector('#' + id).hidden = route.tab === 'abilities';
    },
    focusHeading() { root.querySelector('h1')?.focus({ preventScroll: true }); },
  };
}
