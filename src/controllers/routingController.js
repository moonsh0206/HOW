import { createCounterService } from '../services/counterService.js';
export function parseRoute(hash) {
  const match = /^#\/heroes\/([a-z0-9-]+)(?:\/(overview|abilities|perks))?$/.exec(hash);
  if (match) return { page: 'detail', key: match[1], tab: match[2] || 'overview' };
  if (['', '#', '#heroes', '#favorites', '#/'].includes(hash)) return { page: 'list' };
  return { page: 'not-found' };
}
export function createRoutingController({ model, detailService, detailView, counterService = createCounterService() }) {
  let generation = 0, currentKey, route = parseRoute(location.hash);
  let detailState = { status: 'loading', result: null, error: '' };
  function render() {
    document.querySelector('#list-page').hidden = route.page !== 'list';
    document.querySelector('#hero-detail-page').hidden = route.page !== 'detail';
    document.querySelector('#route-not-found').hidden = route.page !== 'not-found';
    if (route.page === 'detail') detailView.render(detailState, model, route, counterService.getHeroCounters(route.key, model.state.heroes));
  }
  async function load() {
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
    if (route.page !== 'detail') { ++generation; currentKey = null; render(); return; }
    if (route.key !== currentKey) { currentKey = route.key; load(); }
    else render();
  }
  const retry = event => { if (event.target.closest('[data-action="detail-retry"]') && route.page === 'detail') load(); };
  return {
    start() { window.addEventListener('hashchange', navigate); document.addEventListener('click', retry); navigate(); },
    refresh: render,
    stop() { ++generation; window.removeEventListener('hashchange', navigate); document.removeEventListener('click', retry); },
  };
}
