import { createCounterService } from '../services/counterService.js';
import { buildPickHistory } from '../models/pickHistoryModel.js';
import { statisticsQuery } from '../models/statisticsModel.js';
export function parseRoute(hash) {
  const match = /^#\/heroes\/([a-z0-9-]+)(?:\/(overview|abilities|perks))?$/.exec(hash);
  if (match) return { page: 'detail', key: match[1], tab: match[2] || 'overview' };
  if (['', '#', '#heroes', '#favorites', '#/'].includes(hash)) return { page: 'list' };
  return { page: 'not-found' };
}
export function createRoutingController({ model, detailService, detailView, counterService = createCounterService(), historyService }) {
  let generation = 0, currentKey, route = parseRoute(location.hash);
  let detailState = { status: 'loading', result: null, error: '' };
  let historyGeneration = 0, historyKey, historyDays = 7;
  let historyState = { status: 'idle', days: historyDays };
  function resetHistory() { ++historyGeneration; historyKey = null; historyState = { status: 'idle', days: historyDays }; }
  function loadHistory() {
    if (!historyService || detailState.status !== 'ready') return;
    const filters = { ...model.state.statsFilters }, key = route.key;
    const signature = `${key}:${statisticsQuery(filters)}:${historyDays}`;
    if (historyKey === signature) return;
    historyKey = signature; const token = ++historyGeneration, days = historyDays;
    historyState = { status: 'loading', days };
    Promise.resolve().then(() => historyService.getHistory(filters, { days })).then(result => {
      if (token !== historyGeneration || route.page !== 'detail' || route.key !== key) return;
      if (!result.snapshots.length && result.warnings?.length) throw new Error('저장된 이력 파일을 읽지 못했습니다. 다시 시도해 주세요.');
      const data = buildPickHistory([...result.snapshots, ...(result.gaps ?? []).map(entry => ({ ...entry, records: [] }))], key, filters, { days, now: Date.parse(result.observedUntil) });
      data.warnings.push(...(result.warnings ?? [])); historyState = { status: 'ready', days, result: data };
    }).catch(error => {
      if (token === historyGeneration) historyState = { status: 'error', days, error: error.message };
    }).finally(() => { if (token === historyGeneration) render(); });
  }
  function render() {
    document.querySelector('#list-page').hidden = route.page !== 'list';
    document.querySelector('#hero-detail-page').hidden = route.page !== 'detail';
    document.querySelector('#route-not-found').hidden = route.page !== 'not-found';
    if (route.page === 'detail') { loadHistory(); detailView.render(detailState, model, route, counterService.getHeroCounters(route.key, model.state.heroes), historyState); }
  }
  async function load() {
    resetHistory();
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
    const range = event.target.closest('[data-history-days]');
    if (range && [7,30].includes(Number(range.dataset.historyDays))) { historyDays = Number(range.dataset.historyDays); historyKey = null; render(); }
    if (event.target.closest('[data-action="history-retry"]')) { historyKey = null; render(); }
  };
  return {
    start() { window.addEventListener('hashchange', navigate); document.addEventListener('click', retry); navigate(); },
    refresh: render,
    stop() { ++generation; resetHistory(); window.removeEventListener('hashchange', navigate); document.removeEventListener('click', retry); },
  };
}
