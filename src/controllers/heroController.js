import { validateFilters } from '../models/statisticsModel.js';

export function createHeroController({ model, view, service, statisticsService, storage, autoRefresh = true }) {
  let loading = false;
  let statsGeneration = 0;
  let statsTimer;
  async function loadStatistics() {
    if (!statisticsService) return;
    clearTimeout(statsTimer);
    const generation = ++statsGeneration;
    const filters = { ...model.state.statsFilters };
    model.state.statsStatus = 'loading'; model.state.statsError = ''; view.render(model);
    try {
      const result = await statisticsService.getStatistics(filters);
      if (generation !== statsGeneration) return;
      model.state.statistics = result;
      model.state.statsStatus = result.stale ? 'stale' : result.records.length ? 'ready' : 'empty';
      model.state.statsError = result.error || '';
    } catch (error) {
      if (generation !== statsGeneration) return;
      model.state.statsStatus = 'error'; model.state.statsError = error.message;
    } finally {
      if (generation === statsGeneration) {
        view.render(model);
        if (autoRefresh) {
          const next = model.state.statistics?.retryAt ?? model.state.statistics?.expiresAt ?? Date.now() + 60000;
          statsTimer = setTimeout(loadStatistics, Math.max(60000, next - Date.now()));
        }
      }
    }
  }
  async function load() {
    if (loading) return;
    loading = true; model.state.status = 'loading'; view.render(model);
    try { const result = await service.getHeroes(); Object.assign(model.state, result, { status: 'ready', error: '' }); }
    catch (error) { Object.assign(model.state, { status: 'error', error: error.message }); }
    finally { loading = false; view.render(model); }
  }
  function route() {
    const favorites = location.hash === '#favorites';
    if (model.state.favoritesOnly !== favorites) {
      Object.assign(model.state, { favoritesOnly: favorites, role: 'all', query: '' });
      document.querySelector('#hero-search').value = '';
    }
    view.render(model);
  }
  return {
    start() {
      document.querySelector('#hero-search').addEventListener('input', event => { model.state.query = event.target.value; view.render(model); });
      document.querySelector('#sort').addEventListener('change', event => { model.state.sort = event.target.value; view.render(model); });
      document.querySelector('#statistics-filters')?.addEventListener('change', event => {
        const field = event.target.dataset.statsFilter;
        if (!['gamemode', 'region', 'division'].includes(field)) return;
        const next = { ...model.state.statsFilters, [field]: event.target.value };
        if (next.gamemode === 'quickplay') next.division = 'all';
        try { model.state.statsFilters = validateFilters(next); }
        catch (error) { view.notify(error.message); view.render(model); return; }
        model.state.statistics = null;
        view.closeDetail();
        loadStatistics();
      });
      document.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.role) { model.state.role = button.dataset.role; view.render(model); }
        if (button.dataset.action === 'retry') load();
        if (button.dataset.action === 'stats-refresh') loadStatistics();
        if (button.dataset.favorite) {
          const key = button.dataset.favorite;
          model.state.favorites.has(key) ? model.state.favorites.delete(key) : model.state.favorites.add(key);
          if (!storage.save(model.state.favorites)) view.notify('브라우저 저장소를 사용할 수 없어 이번 방문 동안만 유지됩니다.');
          view.render(model);
        }
        if (button.dataset.hero) { const hero = model.heroByKey(button.dataset.hero); if (hero) view.showDetail(hero, model.state); }
      });
      document.querySelector('#close-detail').addEventListener('click', view.closeDetail);
      window.addEventListener('hashchange', route);
      route(); load(); loadStatistics();
    },
    stop() { ++statsGeneration; clearTimeout(statsTimer); },
  };
}
