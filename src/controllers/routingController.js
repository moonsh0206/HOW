import {syncCompactMain} from '../views/compactMainView.js';
import { createCounterService } from '../services/counterService.js';
import { HISTORY_METRICS } from '../models/pickHistoryModel.js';
import { statisticsQuery } from '../models/statisticsModel.js';
import { buildObservationTimeline } from '../models/patchHistoryModel.js';
import { CURRENT_STATISTICS_PATCH } from '../data/patchCatalog.js';
import { createSynergyService } from '../services/synergyService.js';
import {perkCardsForDetail} from '../models/perkSelectionModel.js';
import {createMainMenuView} from '../views/mainMenuView.js';
export function parseRoute(hash) {
  const match = /^#\/heroes\/([a-z0-9-]+)(?:\/(overview|abilities|perks))?$/.exec(hash);
  if (match) return { page: 'detail', key: match[1], tab: match[2] || 'overview' };
  if (['', '#', '#heroes', '#favorites', '#/', '#/tiers'].includes(hash)) return { page: 'list' };
  if(hash==='#/meta')return {page:'meta'};
  if(hash==='#/player-search')return {page:'player-search'};
  return { page: 'not-found' };
}
export function createRoutingController({ model, detailService, detailView, counterService = createCounterService(), historyService, mapStatisticsController, synergyService=createSynergyService(),perkStatisticsService,patchModel }) {
  let generation = 0, currentKey, route = parseRoute(location.hash);
  const menuView=createMainMenuView(),scrollPositions=new Map();
  const menuMedia=window.matchMedia?.('(max-width: 767px)');
  let currentHash=location.hash,lastMainHash='#/tiers';
  let scrollFrame=null;
  const previousScrollRestoration=window.history?.scrollRestoration;
  function cancelScroll(){if(scrollFrame!==null){window.cancelAnimationFrame?.(scrollFrame);scrollFrame=null;}}
  function scheduleScroll(accept,top){
    cancelScroll();if(!window.requestAnimationFrame)return;
    scrollFrame=window.requestAnimationFrame(()=>{scrollFrame=null;if(accept())window.scrollTo({top,left:0,behavior:'instant'});});
  }
  const rememberScroll=()=>{if(route.page==='list'||route.page==='meta')scrollPositions.set(currentHash,window.scrollY??0);};
  const sharedFilters=document.querySelector('#statistics-filters'),filterHome=document.createComment('Shared statistics filters');sharedFilters?.before(filterHome);
  let detailState = { status: 'loading', result: null, error: '' };
  let perkGeneration=0,perkKey=null,perkState={status:'unavailable',result:null};
  function resetPerks(){++perkGeneration;perkKey=null;perkState={status:perkStatisticsService?'idle':'unavailable',result:null};}
  function loadPerks(){
    if(!perkStatisticsService||detailState.status!=='ready'||perkKey===route.key)return;
    const key=route.key,token=++perkGeneration;perkKey=key;perkState={status:'loading',result:null};
    Promise.resolve().then(()=>perkStatisticsService.getHeroPerks(key)).then(result=>{
      if(token!==perkGeneration||route.page!=='detail'||route.key!==key)return;
      perkState={status:'ready',result};
    }).catch(error=>{if(token===perkGeneration)perkState={status:'error',result:null,error:error.message};})
      .finally(()=>{if(token===perkGeneration)render();});
  }
  let historyGeneration = 0, historyKey, historyDays = 7;
  let historyState = { status: 'idle', days: historyDays };
  let historyMetric = 'pickRate', historyArchive;
  const historyScope = 'compare';
  function resetHistory() { ++historyGeneration; historyKey = null; historyMetric = 'pickRate'; historyArchive = null; historyState = { status: 'idle', days: historyDays }; }
  function historyResult(result, key, filters, days) {
    const snapshots = [...result.snapshots, ...(result.gaps ?? []).map(entry => ({ ...entry, records: [] }))];
    const options = { days, now: Date.parse(result.observedUntil), metric: historyMetric };
    const data = buildObservationTimeline(snapshots,key,filters,{...options,currentPatch:CURRENT_STATISTICS_PATCH});
    data.warnings.push(...(result.warnings ?? [])); return { status: 'ready', days, result: data };
  }
  function loadHistory() {
    if (!historyService || detailState.status !== 'ready') return;
    const filters = { ...model.state.statsFilters }, key = route.key;
    const signature = `${key}:${statisticsQuery(filters)}:${historyDays}:${historyScope}`;
    if (historyKey === signature) return;
    historyKey = signature; const token = ++historyGeneration, days = historyDays;
    historyArchive = null; historyState = { status: 'loading', days };
    const scope = historyScope;
    Promise.resolve().then(() => historyService.getHistory(filters, { days, scope })).then(result => {
      if (token !== historyGeneration || route.page !== 'detail' || route.key !== key) return;
      if (!result.snapshots.length && result.warnings?.length) throw new Error('저장된 이력 파일을 읽지 못했습니다. 다시 시도해 주세요.');
      historyArchive = result; historyState = historyResult(result, key, filters, days);
    }).catch(error => {
      if (token === historyGeneration) historyState = { status: 'error', days, error: error.message };
    }).finally(() => { if (token === historyGeneration) render(); });
  }
  function render() {
    const mobile=menuMedia?.matches??(window.innerWidth<=767);
    menuView.render(route,lastMainHash,mobile);
    document.querySelector('#list-page').hidden = route.page !== 'list'&&!(route.page==='meta'&&!mobile);
    document.querySelector('#hero-detail-page').hidden = route.page !== 'detail';
    document.querySelector('#route-not-found').hidden = route.page !== 'not-found';
    if (route.page === 'detail') {
      if(detailState.status==='ready')mapStatisticsController?.setContext(route.key,model.state.statsFilters);
      loadHistory(); loadPerks();
      const perkPresentation=detailState.status==='ready'?{...perkState,cards:perkCardsForDetail(route.key,detailState.result.detail,perkState)}:perkState;
      detailView.render(detailState, model, route, counterService.getHeroCounters(route.key, model.state.heroes), { ...historyState, metric: historyMetric, scope: historyScope }, mapStatisticsController?.getState(),synergyService.getHeroSynergies(route.key,model.state.heroes),perkPresentation,patchModel?.state.data);
      const host=document.querySelector('#detail-filter-host');if(host&&sharedFilters&&sharedFilters.parentElement!==host)host.append(sharedFilters);
    } else {mapStatisticsController?.leave();const metaHost=route.page==='meta'&&mobile?document.querySelector('#meta-filter-host'):null;if(metaHost&&sharedFilters){if(sharedFilters.parentElement!==metaHost)metaHost.append(sharedFilters);}else if(sharedFilters&&sharedFilters.previousSibling!==filterHome)filterHome.after(sharedFilters);}
    syncCompactMain(sharedFilters);
  }
  async function load() {
    resetHistory();
    resetPerks();
    mapStatisticsController?.leave();
    const key = route.key; const token = ++generation;
    detailState = { status: 'loading', result: null, error: '' }; render();
    try {
      const result = await detailService.getHero(key);
      if (token !== generation || route.page !== 'detail' || route.key !== key) return;
      detailState = { status: 'ready', result, error: '' };
    } catch (error) {
      if (token !== generation) return;
      detailState = { status: 'error', result: null, error: error.message };
    }
    render(); detailView.focusHeading();
  }
  function navigate() {
    const next=parseRoute(location.hash);
    if(next.page==='detail'&&route.page!=='detail')lastMainHash=['list','meta'].includes(route.page)?currentHash||'#/tiers':'#/tiers';
    currentHash=location.hash;route=next.page==='detail'?{...next,returnHash:lastMainHash}:next;
    if (route.page !== 'detail') { ++generation; currentKey = null; resetHistory(); resetPerks(); render();const targetHash=currentHash;const y=scrollPositions.get(targetHash);if(y!==undefined||targetHash.startsWith('#/'))scheduleScroll(()=>currentHash===targetHash&&route.page!=='detail',y??0);else cancelScroll();return; }
    if (route.key !== currentKey) { currentKey = route.key;const key=currentKey;load();scheduleScroll(()=>route.page==='detail'&&route.key===key,0); }
    else render();
  }
  const retry = event => {
    if (route.page !== 'detail') return;
    if (event.target.closest('[data-action="detail-retry"]')) load();
    if (event.target.closest('[data-action="map-stats-retry"]')) mapStatisticsController?.retry();
    const metric = event.target.closest('[data-history-metric]');
    if (metric && HISTORY_METRICS.includes(metric.dataset.historyMetric)) {
      historyMetric = metric.dataset.historyMetric;
      if (historyArchive) historyState = historyResult(historyArchive, route.key, model.state.statsFilters, historyDays);
      render();
    }
    if (event.target.closest('[data-action="history-retry"]')) { historyKey = null; render(); }
    if (event.target.closest('[data-action="perk-stats-retry"]')) { perkKey=null; render(); }
  };
  const mapChange=()=>{};
  return {
    start() { if(previousScrollRestoration!==undefined)window.history.scrollRestoration='manual';menuMedia?.addEventListener?.('change',render);window.addEventListener('hashchange', navigate);window.addEventListener('scroll',rememberScroll,{passive:true});document.addEventListener('click',rememberScroll,true); document.addEventListener('click', retry); document.addEventListener('change',mapChange); navigate(); },
    refresh: render,
    stop() { ++generation;cancelScroll();menuMedia?.removeEventListener?.('change',render);if(previousScrollRestoration!==undefined)window.history.scrollRestoration=previousScrollRestoration; resetHistory();resetPerks();mapStatisticsController?.leave(); window.removeEventListener('hashchange', navigate);window.removeEventListener('scroll',rememberScroll);document.removeEventListener('click',rememberScroll,true); document.removeEventListener('click', retry);document.removeEventListener('change',mapChange); },
  };
}
