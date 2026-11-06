import { validateFilters, statisticsQuery } from '../models/statisticsModel.js';

export function createHeroController({ model, view, service, statisticsService, snapshotService, mapService,storage,filterStorage, autoRefresh = true, onStateChange, onHeroSelect }) {
  let loading = false;
  let statsGeneration = 0;
  let statsTimer;
  function render() { view.render(model); onStateChange?.(); }
  async function loadPrevious(result, generation) {
    if (!snapshotService || result.stale) return;
    model.state.snapshotStatus = 'loading';
    try {
      const previous = await snapshotService.getPrevious(result.filters, result.fetchedAt);
      if (generation !== statsGeneration) return;
      model.state.previousSnapshot = previous; model.state.snapshotStatus = previous ? 'ready' : 'empty'; model.state.snapshotError = '';
    } catch (error) {
      if (generation !== statsGeneration) return;
      model.state.previousSnapshot = null; model.state.snapshotStatus = 'error'; model.state.snapshotError = error.message;
    }
    render();
  }
  async function loadStatistics() {
    if (!statisticsService) return;
    clearTimeout(statsTimer);
    const generation = ++statsGeneration;
    const filters = { ...model.state.statsFilters };
    model.state.statsStatus = 'loading'; model.state.statsError = ''; render();
    try {
      const result = await statisticsService.getStatistics(filters);
      if (generation !== statsGeneration) return;
      if (!result.filters || statisticsQuery(result.filters) !== statisticsQuery(filters)) throw new Error('요청 조건과 통계 응답 조건이 일치하지 않습니다.');
      model.state.statistics = result;
      model.state.statsStatus = result.stale ? 'stale' : result.records.length ? 'ready' : 'empty';
      model.state.statsError = result.error || '';
      loadPrevious(result, generation);
    } catch (error) {
      if (generation !== statsGeneration) return;
      model.state.statsStatus = 'error'; model.state.statsError = error.message;
    } finally {
      if (generation === statsGeneration) {
        render();
        if (autoRefresh) {
          const next = model.state.statistics?.retryAt ?? model.state.statistics?.expiresAt ?? Date.now() + 60000;
          statsTimer = setTimeout(loadStatistics, Math.max(60000, next - Date.now()));
        }
      }
    }
  }
  async function load() {
    if (loading) return;
    loading = true; model.state.status = 'loading'; render();
    try { const result = await service.getHeroes(); Object.assign(model.state, result, { status: 'ready', error: '' }); }
    catch (error) { Object.assign(model.state, { status: 'error', error: error.message }); }
    finally { loading = false; render(); }
  }
  function route() {
    if (location.hash.startsWith('#/heroes/')) return;
    const favorites = location.hash === '#favorites';
    if (model.state.favoritesOnly !== favorites) {
      Object.assign(model.state, { favoritesOnly: favorites, role: 'all', query: '' });
      document.querySelector('#hero-search').value = '';
    }
    render();
  }
  return {
    start() {
      mapService?.getMaps().then(maps=>view.setMaps?.(maps,model.state.statsFilters.map)).catch(()=>view.notify('전장 목록 갱신 실패 · 마지막으로 검증된 목록을 사용합니다.'));
      document.querySelector('#hero-search').addEventListener('input', event => { model.state.query = event.target.value; render(); });
      document.querySelector('#sort').addEventListener('change', event => { model.state.sort = event.target.value; render(); });
      document.querySelector('#statistics-filters')?.addEventListener('change', event => {
        const field = event.target.dataset.statsFilter;
        if (!['gamemode', 'region', 'division','map'].includes(field)) return;
        const next = { ...model.state.statsFilters, [field]: event.target.value };
        if (next.gamemode === 'quickplay') next.division = 'all';
        try { model.state.statsFilters = validateFilters(next); }
        catch (error) { view.notify(error.message); render(); return; }
        filterStorage?.save(model.state.statsFilters);
        model.state.statistics = null;
        model.state.previousSnapshot = null; model.state.snapshotStatus = 'idle'; model.state.snapshotError = '';
        view.closeDetail();
        view.closeTierReason?.();
        loadStatistics();
      });
      document.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.tier) { const hero = model.heroByKey(button.dataset.tier); if (hero) view.showTierReason?.(hero, model.state); }
        if (button.dataset.role) { model.state.role = button.dataset.role; render(); }
        if (button.dataset.action === 'retry') load();
        if (button.dataset.action === 'stats-refresh') loadStatistics();
        if (button.dataset.favorite) {
          const key = button.dataset.favorite;
          model.state.favorites.has(key) ? model.state.favorites.delete(key) : model.state.favorites.add(key);
          if (!storage.save(model.state.favorites)) view.notify('브라우저 저장소를 사용할 수 없어 이번 방문 동안만 유지됩니다.');
          render();
        }
        if (button.dataset.hero) { const hero = model.heroByKey(button.dataset.hero); if (hero) { if (onHeroSelect) onHeroSelect(hero.key); else view.showDetail(hero, model.state); } }
      });
      document.querySelector('#close-detail').addEventListener('click', view.closeDetail);
      window.addEventListener('hashchange', route);
      route(); load(); loadStatistics();
    },
    stop() { ++statsGeneration; clearTimeout(statsTimer); },
  };
}
