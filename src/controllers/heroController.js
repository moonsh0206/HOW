export function createHeroController({ model, view, service, storage }) {
  let loading = false;
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
      document.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.role) { model.state.role = button.dataset.role; view.render(model); }
        if (button.dataset.action === 'retry') load();
        if (button.dataset.favorite) {
          const key = button.dataset.favorite;
          model.state.favorites.has(key) ? model.state.favorites.delete(key) : model.state.favorites.add(key);
          if (!storage.save(model.state.favorites)) view.notify('브라우저 저장소를 사용할 수 없어 이번 방문 동안만 유지됩니다.');
          view.render(model);
        }
        if (button.dataset.hero) { const hero = model.state.heroes.find(item => item.key === button.dataset.hero); if (hero) view.showDetail(hero); }
      });
      document.querySelector('#close-detail').addEventListener('click', view.closeDetail);
      window.addEventListener('hashchange', route);
      route(); load();
    },
  };
}
