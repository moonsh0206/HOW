import { createCounterService } from '../services/counterService.js';
import { HISTORY_METRICS } from '../models/pickHistoryModel.js';
import { statisticsQuery } from '../models/statisticsModel.js';
import { buildObservationTimeline } from '../models/patchHistoryModel.js';
import { CURRENT_STATISTICS_PATCH } from '../data/patchCatalog.js';
import { createSynergyService } from '../services/synergyService.js';
export function parseRoute(hash) {
  const match = /^#\/heroes\/([a-z0-9-]+)(?:\/(overview|abilities|perks))?$/.exec(hash);
  if (match) return { page: 'detail', key: match[1], tab: match[2] || 'overview' };
  if (['', '#', '#heroes', '#favorites', '#/'].includes(hash)) return { page: 'list' };
  return { page: 'not-found' };
}
export function createRoutingController({ model, detailService, detailView, counterService = createCounterService(), historyService, mapStatisticsController, synergyService=createSynergyService() }) {
  let generation = 0, currentKey, route = parseRoute(location.hash);
  const sharedFilters=document.querySelector('#statistics-filters'),filterHome=document.createComment('Shared statistics filters');sharedFilters?.before(filterHome);
  let detailState = { status: 'loading', result: null, error: '' };
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
    document.querySelector('#list-page').hidden = route.page !== 'list';
    document.querySelector('#hero-detail-page').hidden = route.page !== 'detail';
    document.querySelector('#route-not-found').hidden = route.page !== 'not-found';
    if (route.page === 'detail') {
      if(detailState.status==='ready')mapStatisticsController?.setContext(route.key,model.state.statsFilters);
      loadHistory(); detailView.render(detailState, model, route, counterService.getHeroCounters(route.key, model.state.heroes), { ...historyState, metric: historyMetric, scope: historyScope }, mapStatisticsController?.getState(),synergyService.getHeroSynergies(route.key,model.state.heroes));
      const host=document.querySelector('#detail-filter-host');if(host&&sharedFilters&&sharedFilters.parentElement!==host)host.append(sharedFilters);
    } else {mapStatisticsController?.leave();if(sharedFilters&&sharedFilters.previousSibling!==filterHome)filterHome.after(sharedFilters);}
  }
  async function load() {
    resetHistory();
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
    route = parseRoute(location.hash);
    if (route.page !== 'detail') { ++generation; currentKey = null; resetHistory(); render(); return; }
    if (route.key !== currentKey) { currentKey = route.key; load(); }
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
  };
  const mapChange=()=>{};
  return {
    start() { window.addEventListener('hashchange', navigate); document.addEventListener('click', retry); document.addEventListener('change',mapChange); navigate(); },
    refresh: render,
    stop() { ++generation; resetHistory();mapStatisticsController?.leave(); window.removeEventListener('hashchange', navigate); document.removeEventListener('click', retry);document.removeEventListener('change',mapChange); },
  };
}
