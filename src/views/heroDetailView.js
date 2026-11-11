import {errorText} from '../i18n/i18n.js';
import {formatLocale} from '../i18n/i18n.js';
import {t,label as translateLabel} from '../i18n/i18n.js';
import { tierButton } from './tierReasonView.js';
import {recommendationDescription} from '../domain/recommendationPolicy.js';
import { renderCounters } from './counterView.js';
import { renderPickHistory } from './pickHistoryView.js';
import { renderMapStatistics } from './mapStatisticsView.js';
import { renderSynergies } from './synergyView.js';
import { withCurrentPickHistory } from '../models/pickHistoryModel.js';
import {renderPerkSelection,renderPerkStatisticsInfo} from './perkStatisticsView.js';
import {perkCardsForDetail} from '../models/perkSelectionModel.js';
import {renderHeroPatch} from './heroPatchView.js';
import {compactText} from './compactText.js';
import { node, image } from './dom.js';
import { METRICS, metricValue, metricClass,cacheLabel } from './statisticsUI.js';
import {statisticsNeedsReview} from '../models/statisticsQuality.js';
import { ROLES } from '../models/heroModel.js';
import { filterLabel,isCompositeDivision,COMPOSITE_NOTICE,divisionName } from '../models/statisticsModel.js';

function itemCard(item, compact = false) {
  const card = node('article', undefined, 'ability-card'); const header = node('div', undefined, 'ability-heading');
  if (item.icon) header.append(image(item.icon));
  header.append(node('h3', item.name)); card.append(header, compact ? compactText(item.description, 'ability-description', 18) : node('p',item.description));
  if (item.video?.mp4 || item.video?.webm) {
    const disclosure = node('details', undefined, 'ability-video'); disclosure.append(node('summary', t("시연 영상 보기")));
    const video = node('video'); video.controls = true; video.preload = 'none'; video.playsInline = true;
    video.setAttribute('aria-label', t("message.8b0bc7428701",{"0":(item.name)}));
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
    const compact=['detail-minor','detail-major','detail-abilities','detail-unique-passives'].includes(id);
    for (const item of items) {const card=itemCard(item,compact);card.dataset.itemName=item.name;grid.append(card);}
    wrapper.append(items.length ? grid : node('p', t("현재 API에서 제공된 정보가 없습니다."), 'empty-note'));
    return wrapper;
  }
  return {
    render(detailState, model, route, counters = { status: 'empty', counteredBy: [] }, history = { status: 'idle', days: 7 }, mapStatistics = {},synergies={status:'empty',allies:[]},perkStatistics={status:'unavailable',result:null},patchArchive=null) {
      const { state } = model;
      const signature = `${route.key}:${detailState.status}:${detailState.result?.fetchedAt ?? ''}`;
      if (signature !== contentKey) {
        contentKey = signature; root.replaceChildren();
        const back = node('a', route.returnHash==='#/meta'?t("← 현재 메타픽으로 돌아가기"):t("← 영웅 목록으로 돌아가기"), 'detail-back'); back.href = route.returnHash??(state.favoritesOnly ? '#favorites' : '#heroes'); root.append(back);
        const filterHost=node('div',undefined,'detail-filter-host');filterHost.id='detail-filter-host';root.append(filterHost);
        if (detailState.status !== 'ready') {
          const message = node('div', undefined, 'data-state'); message.setAttribute('role', 'status');
          message.append(node('h1', detailState.status === 'loading' ? t("영웅 정보를 불러오는 중") : t("영웅 정보를 표시할 수 없습니다")), node('p', errorText(detailState.error) || t("OverFast API에서 기술과 특전을 확인하고 있습니다.")));
          if (detailState.status === 'error') { const retry = node('button', t("다시 시도"), 'primary-button'); retry.dataset.action = 'detail-retry'; message.append(retry); }
          root.append(message); return;
        }
        const hero = detailState.result.detail;
        const header = node('header', undefined, 'detail-hero');
        if (hero.backgrounds.length) {
          const picture = node('picture', undefined, 'detail-background');
          const fallback = hero.backgrounds.find(item => item.sizes.includes('xl+')) ?? hero.backgrounds[0]; picture.append(image(fallback.url)); header.append(picture);
        }
        const identity = node('div', undefined, 'detail-identity');
        if (hero.portrait) identity.append(image(hero.portrait, 'detail-portrait'));
        const title = node('div'); title.append(node('p', 'HERO INTELLIGENCE', 'eyebrow'));
        const h1 = node('h1', hero.name); h1.tabIndex = -1;
        const badges = node('div', undefined, 'detail-role-badges');
        badges.append(node('span', ROLES[hero.role], `role-tag ${hero.role}`));
        if (hero.subrole) badges.append(node('span', translateLabel(hero.subrole.subroleNameKo), 'subrole-tag'));
        title.append(h1, badges);
        identity.append(title); header.append(identity, compactText(hero.description, 'detail-description')); root.append(header);
        const tabs = node('nav', undefined, 'detail-tabs'); tabs.setAttribute('aria-label', t("영웅 상세 섹션"));
        for (const [tab, label] of [['overview', t("영웅 통계")], ['abilities', t("기술·패시브")], ['perks', t("특전")]]) { const link = node('a', label); link.href = `#/heroes/${hero.key}${tab === 'overview' ? '' : '/' + tab}`; link.dataset.detailTab = tab; tabs.append(link); }
        const overview=node('section',undefined,'detail-overview');overview.id='detail-overview';overview.setAttribute('aria-label',t("전체 정보 · 영웅 통계"));
        const stats = node('section'); stats.id = 'detail-page-statistics'; stats.setAttribute('aria-label', t("영웅 통계 요약"));overview.append(stats);
        const mapStats = node('div');mapStats.id='detail-map-statistics';overview.append(mapStats);
        root.append(tabs,overview, section('detail-abilities', t("영웅 기술"), hero.abilities));
        // Hero-specific passives remain separate; never infer them from names or order.
        if (hero.uniquePassives?.length) root.append(section('detail-unique-passives', t("고유 지속 능력"), hero.uniquePassives));
        root.append(section('detail-minor', t("일반 특전 · Minor"), hero.minor), section('detail-major', t("주요 특전 · Major"), hero.major));
        root.append(renderPerkStatisticsInfo(perkStatistics));
        const source = node('p', t("message.d8f3b95d12fc",{"0":(new Date(detailState.result.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}))}), 'detail-source'); root.append(source);
      }
      if (detailState.status !== 'ready') return;
      const back=root.querySelector('.detail-back');back.href=route.returnHash??(state.favoritesOnly?'#favorites':'#heroes');back.textContent=route.returnHash==='#/meta'?t("← 현재 메타픽으로 돌아가기"):t("← 영웅 목록으로 돌아가기");
      const perkCards=perkStatistics.cards??perkCardsForDetail(route.key,detailState.result.detail,perkStatistics);
      for(const tier of ['minor','major'])for(const card of root.querySelectorAll(`#detail-${tier} .ability-card`)){
        const item=perkCards[tier].find(i=>i.name===card.dataset.itemName);
        if(!item)continue;const selection=renderPerkSelection(item,perkStatistics),old=card.querySelector('.perk-selection');
        if(old)old.replaceWith(selection);else card.append(selection);
      }
      const oldPerkInfo=root.querySelector('#detail-perk-rates');
      const sourceSignature=JSON.stringify([perkStatistics.status,perkStatistics.result?.collectedAt,perkStatistics.result?.fetchedAt,perkStatistics.result?.filters,errorText(perkStatistics.error)]);
      if(oldPerkInfo.dataset.signature!==sourceSignature){
        const perkFocus=oldPerkInfo.contains(document.activeElement),perkInfo=renderPerkStatisticsInfo(perkStatistics);perkInfo.dataset.signature=sourceSignature;oldPerkInfo.replaceWith(perkInfo);
        if(perkFocus)(perkInfo.querySelector('button')??perkInfo.querySelector('a')).focus({preventScroll:true});
      }
      const hero = model.heroByKey(route.key) ?? { ...detailState.result.detail, tier: null, statistics: null, metaScore: null };
      const stats = root.querySelector('#detail-page-statistics');
      const summary = node('div', undefined, 'detail-summary');
      const metrics = node('dl', undefined, 'detail-metrics');
      const activeMetric = history.metric ?? 'pickRate';
      const metricFocus = stats.querySelector('[data-history-metric]:focus')?.dataset.historyMetric;
      for (const [field, label] of METRICS) {
        const group = node('div'), value = node('dd');
        if (field === 'tier') { value.append(tierButton(hero)); group.append(node('dt', label), value); }
        else {
          const selector = node('button', undefined, 'detail-metric-button'); selector.type = 'button'; selector.dataset.historyMetric = field;
          selector.setAttribute('aria-pressed', String(activeMetric === field)); selector.setAttribute('aria-controls','pick-history'); selector.setAttribute('aria-label',t("message.7a430bf163e6",{"0":(label)}));
          selector.append(node('span', label, 'metric-label'),node('span', metricValue(hero, field), metricClass(hero, field)));
          group.append(node('dt',label,'sr-only')); value.append(selector); group.append(value);
        }
        metrics.append(group);
      }
      const summaryTop = node('div', undefined, 'detail-summary-top detail-overview-grid');
      const information = node('div', undefined, 'detail-summary-info');
      const main = node('div', undefined, 'detail-summary-main');
      summaryTop.append(metrics); summary.append(summaryTop);
      information.append(node('p', t("message.c6a08161eaf2",{"0":(hero.metaScore == null ? t("미분류") : hero.metaScore.toFixed(1))})));
      if(translateLabel(recommendationDescription(hero)))information.append(node('p',translateLabel(recommendationDescription(hero)),'recommendation-description'));
      if(isCompositeDivision(state.statsFilters.division))information.append(node('p',translateLabel(COMPOSITE_NOTICE),'composite-notice'));
      if(hero.statistics?.missingDivisions?.length)information.append(node('p',t("message.ba3491270c7b",{"0":(hero.statistics.missingDivisions.map(divisionName).join(', '))}),'history-warning'));
      if(statisticsNeedsReview(hero.statistics))information.append(node('p',t("message.0a685bc83ab3",{"0":(hero.statistics.reviewDivisions?.length?` · ${hero.statistics.reviewDivisions.map(divisionName).join(', ')}`:'')}),'history-warning'));
      const button = node('button', state.favorites.has(route.key) ? t("★ 즐겨찾기 저장됨") : t("☆ 즐겨찾기"), 'detail-favorite'); button.dataset.favorite = route.key; button.setAttribute('aria-pressed', state.favorites.has(route.key)); information.append(button);
      const sourceInfo = node('details', undefined, 'detail-stat-info'); sourceInfo.append(node('summary',t("통계 정보 ⓘ")));
      sourceInfo.append(node('p', filterLabel(state.statsFilters)), node('p', t("message.d4fe1f41a2ec",{"0":(state.statistics?.fetchedAt ? new Date(state.statistics.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}) : t("미제공")),"1":(state.statistics?.stale ? t(" · 오래된 데이터") : '')}))); information.append(sourceInfo);
      if (stats.querySelector('.detail-stat-info')?.open) sourceInfo.open = true;
      sourceInfo.append(node('p',t("message.e42ff5d52706",{"0":(cacheLabel(state.statistics))})));
      for(const component of state.statistics?.components??[])sourceInfo.append(node('p',t("message.a51d6fef15e9",{"0":(divisionName(component.filters?.division??component.division)??t("구성 등급")),"1":(component.fetchedAt??component.collectedAt??t("미제공")),"2":(component.providerAgeSeconds??component.cacheAgeSeconds??t("미제공"))})));
      const focused = document.activeElement === stats.querySelector('[data-favorite]');
      const oldHistory = stats.querySelector('.pick-history');
      const historyFocus = oldHistory?.contains(document.activeElement) ? document.activeElement.dataset.historyDays : null;
      const scopeFocus = oldHistory?.contains(document.activeElement) ? document.activeElement.dataset.historyScope : null;
      const recordsOpen = oldHistory?.querySelector('.history-records')?.open;
      const chart = renderPickHistory(withCurrentPickHistory(history, state.statistics, route.key, state.statsFilters, activeMetric), state.statsFilters);
      if (recordsOpen && chart.querySelector('.history-records')) chart.querySelector('.history-records').open = true;
      main.append(chart, information);
      const basis=node('p',`${state.statsFilters.map==='all'?t("전체 전장 기준"):t("선택 전장 기준")}${state.metaPolicy?.version==='local-60-27-13'?t(" · 로컬 실험 모델"):''}`,'detail-stat-basis');main.prepend(basis);
      const detail = detailState.result.detail;
      root.querySelector('#detail-passives')?.remove();
      const passive = section('detail-passives', t("지속 능력"), detail.subrole ? [{name:translateLabel(detail.subrole.subroleNameKo),description:translateLabel(detail.subrole.descriptionKo)}] : []);
      const mark = detail.subrole?.mark;
      if (mark?.displayAllowed === true && mark.permission === 'approved' && mark.url?.startsWith('https://')) {
        const icon=image(mark.url,'subrole-mark'); icon.alt='';
        const heading=passive.querySelector('.ability-heading');heading.prepend(icon);
        icon.addEventListener('error',()=>icon.remove(),{once:true});
      }
      if (!detail.subrole) passive.querySelector('p').textContent = t("확인된 하위 역할 정보가 없습니다.");
      const patchPanel=renderHeroPatch(patchArchive,route.key);
      const previousPatch=stats.querySelector('.hero-patch-panel');
      const patchFocus=previousPatch?.contains(document.activeElement)?document.activeElement.closest('[data-change-id]')?.dataset.changeId:null;
      if(patchPanel){
        for(const old of previousPatch?.querySelectorAll('[data-change-id] .compact-text.text-expanded')??[]){
          const id=old.closest('[data-change-id]').dataset.changeId;
          const next=[...patchPanel.querySelectorAll('[data-change-id]')].find(el=>el.dataset.changeId===id);
          next?.querySelector('.compact-text-toggle')?.click();
        }
        const oldDetails=previousPatch?.querySelectorAll('details')??[];
        patchPanel.querySelectorAll('details').forEach((el,i)=>{el.open=oldDetails[i]?.open??false;});patchPanel.classList.add('detail-secondary');summaryTop.append(patchPanel);
      }
      const countersPanel=renderCounters(counters),synergyPanel=renderSynergies(synergies);
      for(const panel of [countersPanel,synergyPanel,passive])panel.classList.add('detail-secondary');
      summaryTop.append(main,countersPanel,synergyPanel);
      if(route.tab!=='abilities')summaryTop.append(passive);
      else root.querySelector('#detail-abilities').append(passive);
      stats.replaceChildren(summary); if (focused) button.focus({ preventScroll: true });
      if(patchFocus){const item=[...stats.querySelectorAll('[data-change-id]')].find(el=>el.dataset.changeId===patchFocus);item?.querySelector('.compact-text-toggle')?.focus({preventScroll:true});}
      const mapRoot=root.querySelector('#detail-map-statistics'),mapFocused=mapRoot.contains(document.activeElement),mapPanel=renderMapStatistics(mapStatistics,model,route.key);
      mapRoot.replaceChildren(mapPanel);mapRoot.hidden=route.tab!=='overview';
      if(mapFocused)mapPanel.querySelector('button')?.focus({preventScroll:true});
      if (historyFocus) chart.querySelector(`[data-history-days="${historyFocus}"]`)?.focus({ preventScroll: true });
      if (scopeFocus) chart.querySelector(`[data-history-scope="${scopeFocus}"]`)?.focus({ preventScroll: true });
      if (metricFocus) stats.querySelector(`[data-history-metric="${metricFocus}"]`)?.focus({ preventScroll: true });
      for (const link of root.querySelectorAll('[data-detail-tab]')) { if (link.dataset.detailTab === route.tab) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
      root.querySelector('#detail-overview').hidden=route.tab!=='overview';
      root.querySelector('#detail-abilities').hidden = route.tab !== 'abilities';
      if (root.querySelector('#detail-unique-passives')) root.querySelector('#detail-unique-passives').hidden = route.tab !== 'abilities';
      for (const id of ['detail-minor', 'detail-major', 'detail-perk-rates']) root.querySelector('#' + id).hidden = route.tab !== 'perks';
      root.querySelector('.detail-source').hidden=route.tab==='overview';
    },
    focusHeading() { root.querySelector('h1')?.focus({ preventScroll: true }); },
  };
}
