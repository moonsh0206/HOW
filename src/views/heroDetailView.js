import {recommendHeroMaps} from '../models/heroMapRecommendationModel.js';
import {mapPerformanceEnd} from '../services/heroMapPerformance.js';
import {renderHeroMapRecommendations} from './heroMapRecommendationView.js';
import {errorText} from '../i18n/i18n.js';
import {preserveChartMotion,syncChartMotion} from './chartMotion.js';
import {roleBadge} from './roleIcon.js';
import {formatLocale,getLanguage} from '../i18n/i18n.js';
import {t,label as translateLabel} from '../i18n/i18n.js';
import { tierButton } from './tierReasonView.js';
import {recommendationDescription} from '../domain/recommendationPolicy.js';
import { renderCounters } from './counterView.js';
import { renderPickHistory } from './pickHistoryView.js';
import { renderMapStatistics } from './mapStatisticsView.js';
import { renderSynergies } from './synergyView.js';
import { withCurrentPickHistory } from '../models/pickHistoryModel.js';
import {renderPerkSelection,renderPerkStatisticsInfo,renderPerkComparison} from './perkStatisticsView.js';
import {perkCardsForDetail,perkStageComparison} from '../models/perkSelectionModel.js';
import {renderHeroPatch} from './heroPatchView.js';
import {restorePatchDisclosure} from './patchDisclosure.js';
import {compactText} from './compactText.js';
import { node, image } from './dom.js';
import { METRICS, metricValue, metricClass } from './statisticsUI.js';
import {statisticsNeedsReview} from '../models/statisticsQuality.js';
import { filterLabel,isCompositeDivision,divisionName } from '../models/statisticsModel.js';

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
  let overviewKey,chartLayoutKey,perkKey,lastTab;
  let patchCarry=null,patchHero;
  function enter(elements){
    if(root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    for(const element of elements)element?.animate?.(element.id==='detail-overview'?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  }
  function section(id, title, items) {
    const wrapper = node('section', undefined, 'detail-section'); wrapper.id = id;
    const heading=node('h2',title);
    if(['detail-minor','detail-major'].includes(id)){wrapper.classList.add('perk-comparison-panel');heading.replaceChildren(node('span',t('perk.comparisonTitle')),node('small',title));}
    wrapper.append(heading); const grid = node('div', undefined, 'ability-grid');
    const compact=['detail-minor','detail-major','detail-abilities','detail-unique-passives'].includes(id);
    for (const item of items) {const card=itemCard(item,compact);card.dataset.itemName=item.name;grid.append(card);}
    wrapper.append(items.length ? grid : node('p', t("현재 API에서 제공된 정보가 없습니다."), 'empty-note'));
    return wrapper;
  }
  function historyChart(history,mapStatistics,model,route,oldHistory){
    const state=model.state,activeMetric=history.metric??'pickRate',mapSelected=state.statsFilters.map!=='all',comparison=mapSelected&&history.chartMode!=='history';
    const chart=comparison?renderMapStatistics(mapStatistics,model,route.key,{metric:activeMetric}):renderPickHistory(withCurrentPickHistory(history,state.statistics,route.key,state.statsFilters,activeMetric),state.statsFilters);
    preserveChartMotion(oldHistory,chart);
    if(mapSelected){const toggle=node('button',comparison?t('map.history'):t('map.comparison'),'chart-mode-toggle');toggle.type='button';toggle.dataset.chartMode=comparison?'history':'comparison';toggle.setAttribute('aria-pressed',String(!comparison));chart.querySelector('.history-heading').append(toggle);}
    for(const selector of ['.history-records','.history-info'])if(oldHistory?.querySelector(selector)?.open&&chart.querySelector(selector))chart.querySelector(selector).open=true;
    return chart;
  }
  return {
    render(detailState, model, route, counters = { status: 'empty', counteredBy: [] }, history = { status: 'idle', days: 7 }, mapStatistics = {},synergies={status:'empty',allies:[]},perkStatistics={status:'unavailable',result:null},patchArchive=null,heroMaps=null) {
      const renderStarted=globalThis.performance?.now?.()??0;
      const { state } = model;
      root.setAttribute('aria-busy',String(detailState.status==='loading'));
      const signature = `${getLanguage()}:${route.key}:${detailState.status}:${detailState.result?.fetchedAt ?? ''}`;
      if (signature !== contentKey) {
        if(patchHero!==route.key){patchCarry=null;patchHero=route.key;}
        else patchCarry=root.querySelector('.hero-patch-panel')??patchCarry;
        contentKey = signature; overviewKey=null;perkKey=null;lastTab=null;root.querySelector('.hero-patch-panel')?.patchDisclosure?.dispose();root.replaceChildren();
        const back = node('a', route.returnHash==='#/dashboard'?t('dashboard.back'):route.returnHash==='#/meta'?t("← 현재 메타픽으로 돌아가기"):t("← 영웅 목록으로 돌아가기"), 'detail-back'); back.href = route.returnHash??(state.favoritesOnly ? '#favorites' : '#heroes'); root.append(back);
        const filterHost=node('div',undefined,'detail-filter-host');filterHost.id='detail-filter-host';root.append(filterHost);
        if (detailState.status !== 'ready') {
          const message = node('div', undefined, 'data-state'); message.setAttribute('role', 'status');
          message.append(node('h1', detailState.status === 'loading' ? t("영웅 정보를 불러오는 중") : t("영웅 정보를 표시할 수 없습니다")), node('p', errorText(detailState.error) || t("OverFast API에서 기술과 특전을 확인하고 있습니다.")));
          if (detailState.status === 'error') { const retry = node('button', t("다시 시도"), 'primary-button'); retry.dataset.action = 'detail-retry'; message.append(retry); }
          if(detailState.status==='loading'){
            const skeleton=node('div',undefined,'detail-loading-layout');
            for(const name of ['hero','tabs','summary']){const slot=node('div',undefined,`detail-loading-${name}`);if(name==='hero')slot.append(message);else slot.setAttribute('aria-hidden','true');skeleton.append(slot);}
            root.append(skeleton);
          }else root.append(message);
          syncChartMotion(root,route.key);
          return;
        }
        const hero = detailState.result.detail;
        const header = node('header', undefined, 'detail-hero');
        if (hero.backgrounds.length) {
          const picture = node('picture', undefined, 'detail-background');
          const fallback = hero.backgrounds.find(item => item.sizes.includes('xl+')) ?? hero.backgrounds[0];
          const background=image(fallback.url);background.classList.add('detail-background-image');
          const reveal=()=>background.classList.add('is-loaded');background.addEventListener('load',reveal,{once:true});if(background.complete&&background.naturalWidth)reveal();
          picture.append(background); header.append(picture);
        }
        const identity = node('div', undefined, 'detail-identity');
        if (hero.portrait) identity.append(image(hero.portrait, 'detail-portrait'));
        const title = node('div'); title.append(node('p', 'HERO INTELLIGENCE', 'eyebrow'));
        const h1 = node('h1', hero.name); h1.tabIndex = -1;
        const badges = node('div', undefined, 'detail-role-badges');
        badges.append(roleBadge(hero.role,{showLabel:true}));
        if (hero.subrole) badges.append(node('span', translateLabel(hero.subrole.subroleNameKo), 'subrole-tag'));
        title.append(h1, badges);
        identity.append(title); header.append(identity, compactText(hero.description, 'detail-description')); root.append(header);
        const tabs = node('nav', undefined, 'detail-tabs'); tabs.setAttribute('aria-label', t("영웅 상세 섹션"));
        for (const [tab, label] of [['overview', t("영웅 통계")], ['abilities', t("기술·패시브")], ['perks', t("특전")]]) { const link = node('a', label); link.href = `#/heroes/${hero.key}${tab === 'overview' ? '' : '/' + tab}`; link.dataset.detailTab = tab; tabs.append(link); }
        const overview=node('section',undefined,'detail-overview');overview.id='detail-overview';overview.setAttribute('aria-label',t("전체 정보 · 영웅 통계"));
        const stats = node('section'); stats.id = 'detail-page-statistics'; stats.setAttribute('aria-label', t("영웅 통계 요약"));overview.append(stats);
        root.append(tabs,overview, section('detail-abilities', t("영웅 기술"), hero.abilities));
        // Hero-specific passives remain separate; never infer them from names or order.
        if (hero.uniquePassives?.length) root.append(section('detail-unique-passives', t("고유 지속 능력"), hero.uniquePassives));
        root.append(section('detail-minor', t("일반 특전 · Minor"), hero.minor), section('detail-major', t("주요 특전 · Major"), hero.major));
        root.append(renderPerkStatisticsInfo(perkStatistics));
        const source = node('p', t("message.d8f3b95d12fc",{"0":(new Date(detailState.result.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}))}), 'detail-source'); root.append(source);
        enter([header]);
      }
      if (detailState.status !== 'ready') return;
      const back=root.querySelector('.detail-back');back.href=route.returnHash??(state.favoritesOnly?'#favorites':'#heroes');back.textContent=route.returnHash==='#/dashboard'?t('dashboard.back'):route.returnHash==='#/meta'?t("← 현재 메타픽으로 돌아가기"):t("← 영웅 목록으로 돌아가기");
      const perkCards=perkStatistics.cards??perkCardsForDetail(route.key,detailState.result.detail,perkStatistics);
      const nextPerkKey=JSON.stringify([perkCards,perkStatistics.status,perkStatistics.result?.collectedAt,perkStatistics.error]);
      if(nextPerkKey!==perkKey){perkKey=nextPerkKey;
      const comparisons=Object.fromEntries(['minor','major'].map(tier=>[tier,perkStageComparison(route.key,tier,perkCards[tier],perkStatistics)]));
      for(const tier of ['minor','major'])for(const card of root.querySelectorAll(`#detail-${tier} .ability-card`)){
        const item=perkCards[tier].find(i=>i.name===card.dataset.itemName);
        if(!item)continue;const selection=renderPerkSelection(item,perkStatistics,{showBar:false,digits:1,showRate:comparisons[tier].status!=='ready'}),old=card.querySelector('.perk-selection');
        if(old)old.replaceWith(selection);else card.append(selection);
      }
      for(const tier of ['minor','major']){const section=root.querySelector(`#detail-${tier}`),comparison=renderPerkComparison(perkCards[tier],comparisons[tier]),old=section.querySelector('.perk-stage-comparison');if(old)old.replaceWith(comparison);else if(perkCards[tier].length)section.append(comparison);}
      }
      const oldPerkInfo=root.querySelector('#detail-perk-rates');
      const sourceSignature=JSON.stringify([perkStatistics.status,perkStatistics.result?.collectedAt,perkStatistics.result?.fetchedAt,perkStatistics.result?.filters,errorText(perkStatistics.error)]);
      if(oldPerkInfo.dataset.signature!==sourceSignature){
        const perkFocus=oldPerkInfo.contains(document.activeElement),perkInfo=renderPerkStatisticsInfo(perkStatistics);perkInfo.dataset.signature=sourceSignature;oldPerkInfo.replaceWith(perkInfo);
        if(perkFocus)(perkInfo.querySelector('button')??perkInfo.querySelector('a')).focus({preventScroll:true});
      }
      const hero = model.heroByKey(route.key) ?? { ...detailState.result.detail, tier: null, statistics: null, metaScore: null };
      const nextOverviewKey=JSON.stringify([hero,state.statsFilters,state.statistics,state.metaPolicy,state.favorites.has(route.key),history,counters,synergies,patchArchive,mapStatistics,heroMaps]);
      const nextLayoutKey=JSON.stringify([hero,state.statsFilters,state.statistics,state.metaPolicy,state.favorites.has(route.key),counters,synergies,patchArchive,heroMaps]);
      const existingChart=root.querySelector('#detail-page-statistics .pick-history');
      if(nextOverviewKey!==overviewKey&&chartLayoutKey===nextLayoutKey&&existingChart){
        overviewKey=nextOverviewKey;
        const modeFocused=existingChart.querySelector('[data-chart-mode]')===document.activeElement;
        const chart=historyChart(history,mapStatistics,model,route,existingChart);
        existingChart.replaceWith(chart);
        for(const button of root.querySelectorAll('.detail-metric-button'))button.setAttribute('aria-pressed',String(button.dataset.historyMetric===(history.metric??'pickRate')));
        if(modeFocused)chart.querySelector('[data-chart-mode]')?.focus({preventScroll:true});
      }else if(nextOverviewKey!==overviewKey){overviewKey=nextOverviewKey;chartLayoutKey=nextLayoutKey;
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
      if(hero.statistics?.missingDivisions?.length)information.append(node('p',t("message.ba3491270c7b",{"0":(hero.statistics.missingDivisions.map(divisionName).join(', '))}),'history-warning'));
      if(statisticsNeedsReview(hero.statistics))information.append(node('p',t("message.0a685bc83ab3",{"0":(hero.statistics.reviewDivisions?.length?` · ${hero.statistics.reviewDivisions.map(divisionName).join(', ')}`:'')}),'history-warning'));
      const button = node('button', state.favorites.has(route.key) ? t("★ 즐겨찾기 저장됨") : t("☆ 즐겨찾기"), 'detail-favorite'); button.dataset.favorite = route.key; button.setAttribute('aria-pressed', state.favorites.has(route.key)); information.append(button);
      const sourceInfo=node('div',undefined,'detail-stat-info');
      if(isCompositeDivision(state.statsFilters.division))sourceInfo.append(node('p',t('ui.composite'),'composite-notice'));
      if(state.statistics?.fetchedAt)sourceInfo.append(node('p',t('ui.sourceTime',{time:new Date(state.statistics.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'})})));
      information.append(sourceInfo);
      const focused = document.activeElement === stats.querySelector('[data-favorite]');
      const oldHistory = stats.querySelector('.pick-history');
      const historyFocus = oldHistory?.contains(document.activeElement) ? document.activeElement.dataset.historyDays : null;
      const scopeFocus = oldHistory?.contains(document.activeElement) ? document.activeElement.dataset.historyScope : null;
      const modeFocused=oldHistory?.contains(document.activeElement)&&document.activeElement.hasAttribute('data-chart-mode');
      const mapRetryFocused=oldHistory?.contains(document.activeElement)&&document.activeElement.hasAttribute('data-map-stats-retry');
      const chartInfoFocused=document.activeElement===oldHistory?.querySelector('.history-info>summary');
      const chart = historyChart(history,mapStatistics,model,route,oldHistory);
      main.append(chart);
      const mapFocus=stats.querySelector('[data-hero-map]:focus')?.dataset.heroMap;
      if(heroMaps){
        const result=heroMaps.recommendation??recommendHeroMaps(heroMaps,route.key,state.statsFilters);
        const signature=JSON.stringify([getLanguage(),route.key,result,heroMaps.maps]);
        const previous=stats.querySelector('#hero-map-recommendations');
        const recommendations=previous?.recommendationSignature===signature?previous:renderHeroMapRecommendations(result,heroMaps);
        recommendations.recommendationSignature=signature;main.append(recommendations);
      }
      main.append(information);
      const basis=node('p',`${state.statsFilters.map==='all'?t("전체 전장 기준"):t("선택 전장 기준")}${isCompositeDivision(state.statsFilters.division)?t(" · HOW 등급 균등 평균"):''}${(state.metaPolicy?.version==='local-60-27-13'||state.metaPolicy?.preview===true)?t(" · 로컬 실험 모델"):''}`,'detail-stat-basis');main.prepend(basis);
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
      const previousPatch=stats.querySelector('.hero-patch-panel')??patchCarry;patchCarry=null;
      const patchToggleFocus=previousPatch?.querySelector('.hero-patch-toggle')===document.activeElement;
      const patchDetailFocus=document.activeElement?.matches('.hero-patch-panel summary')?document.activeElement.parentElement.dataset.patchDetail:null;
      restorePatchDisclosure(previousPatch,patchPanel);
      const patchFocus=previousPatch?.contains(document.activeElement)?document.activeElement.closest('[data-change-id]')?.dataset.changeId:null;
      if(patchPanel){
        for(const old of previousPatch?.querySelectorAll('[data-change-id] .compact-text.text-expanded')??[]){
          const id=old.closest('[data-change-id]').dataset.changeId;
          const next=[...patchPanel.querySelectorAll('[data-change-id]')].find(el=>el.dataset.changeId===id);
          next?.querySelector('.compact-text-toggle')?.click();
        }
        const oldDetails=new Map([...(previousPatch?.querySelectorAll('details')??[])].map(el=>[el.dataset.patchDetail,el.open]));
        patchPanel.querySelectorAll('details').forEach(el=>{el.open=oldDetails.get(el.dataset.patchDetail)??false;});patchPanel.classList.add('detail-secondary');summaryTop.append(patchPanel);
      }
      const countersPanel=renderCounters(counters),synergyPanel=renderSynergies(synergies);
      for(const panel of [countersPanel,synergyPanel,passive])panel.classList.add('detail-secondary');
      summaryTop.append(main,countersPanel,synergyPanel);
      if(route.tab!=='abilities')summaryTop.append(passive);
      else root.querySelector('#detail-abilities').append(passive);
      stats.replaceChildren(summary); if (focused) button.focus({ preventScroll: true });
      if(heroMaps?.traceId)mapPerformanceEnd(heroMaps.traceId,'rendered',{hero:route.key,renderMs:(globalThis.performance?.now?.()??0)-renderStarted});
      if(mapFocus)[...stats.querySelectorAll('[data-hero-map]')].find(el=>el.dataset.heroMap===mapFocus)?.focus({preventScroll:true});
      if(patchToggleFocus)patchPanel?.querySelector('.hero-patch-toggle')?.focus({preventScroll:true});
      if(patchDetailFocus)[...(patchPanel?.querySelectorAll('details')??[])].find(el=>el.dataset.patchDetail===patchDetailFocus)?.querySelector('summary')?.focus({preventScroll:true});
      if(patchFocus){const item=[...stats.querySelectorAll('[data-change-id]')].find(el=>el.dataset.changeId===patchFocus);item?.querySelector('.compact-text-toggle')?.focus({preventScroll:true});}
      if(modeFocused)chart.querySelector('[data-chart-mode]')?.focus({preventScroll:true});
      if(mapRetryFocused)(chart.querySelector('[data-map-stats-retry]')??chart.querySelector('[data-chart-mode]'))?.focus({preventScroll:true});
      if(chartInfoFocused)chart.querySelector('.history-info>summary')?.focus({preventScroll:true});
      if (historyFocus) chart.querySelector(`[data-history-days="${historyFocus}"]`)?.focus({ preventScroll: true });
      if (scopeFocus) chart.querySelector(`[data-history-scope="${scopeFocus}"]`)?.focus({ preventScroll: true });
      if (metricFocus) stats.querySelector(`[data-history-metric="${metricFocus}"]`)?.focus({ preventScroll: true });
      }
      // Keep the same passive/chart/card nodes on a tab-only transition.
      const passive=root.querySelector('#detail-passives');
      const passiveHost=route.tab==='abilities'?root.querySelector('#detail-abilities'):root.querySelector('.detail-overview-grid');
      if(passive&&passive.parentElement!==passiveHost)passiveHost.append(passive);
      for (const link of root.querySelectorAll('[data-detail-tab]')) { if (link.dataset.detailTab === route.tab) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
      root.querySelector('#detail-overview').hidden=route.tab!=='overview';
      root.querySelector('#detail-abilities').hidden = route.tab !== 'abilities';
      if (root.querySelector('#detail-unique-passives')) root.querySelector('#detail-unique-passives').hidden = route.tab !== 'abilities';
      for (const id of ['detail-minor', 'detail-major', 'detail-perk-rates']) root.querySelector('#' + id).hidden = route.tab !== 'perks';
      root.querySelector('.detail-source').hidden=route.tab==='overview';
      if(lastTab!==route.tab){lastTab=route.tab;enter([...root.querySelectorAll('#detail-overview,#detail-abilities,#detail-unique-passives,#detail-minor,#detail-major,#detail-perk-rates')].filter(el=>!el.hidden));}
      syncChartMotion(root,route.key);
    },
    focusHeading() { root.querySelector('h1')?.focus({ preventScroll: true }); },
  };
}
