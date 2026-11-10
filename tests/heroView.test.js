import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createHeroModel, normalizeHeroes } from '../src/models/heroModel.js';
import { createHeroView } from '../src/views/heroView.js';
import { createHeroController } from '../src/controllers/heroController.js';
import { createFavoritesStorage } from '../src/storage/favoritesStorage.js';
import { normalizeStatistics, DEFAULT_FILTERS } from '../src/models/statisticsModel.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const heroes = normalizeHeroes([
  { key: 'ana', name: '아나', role: 'support', portrait: 'https://example.com/ana.png' },
  { key: 'dva', name: 'D.Va', role: 'tank' },
  { key: 'soldier-76', name: '솔저: 76', role: 'damage', description: '<img src=x onerror=alert(1)>' },
]);

async function withDOM(callback) {
  const dom = new JSDOM(html, { url: 'https://example.github.io/HOW/' });
  const previous = { window: globalThis.window, document: globalThis.document, location: globalThis.location };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, location: dom.window.location });
  try { await callback(dom.window); }
  finally { dom.window.close(); Object.assign(globalThis, previous); }
}

test('card and table use the same controller filters and storage selection', async () => withDOM(async window => {
  const model = createHeroModel();
  const view = createHeroView();
  const storage = createFavoritesStorage(() => window.localStorage);
  let requests = 0;
  createHeroController({ model, view, storage, service: { async getHeroes() { requests++; return { heroes, fetchedAt: '2026-11-02T00:00:00Z' }; } } }).start();
  await new Promise(resolve => setImmediate(resolve));
  const count = (selector, expected) => assert.equal(document.querySelectorAll(selector).length, expected);
  count('#hero-cards .hero-card', 3); count('#hero-rows tr', 3);
  count('#hero-cards dd', 12);
  assert([...document.querySelectorAll('#hero-cards dd')].every(node => ['미제공', '미분류'].includes(node.textContent)));
  const search = document.querySelector('#hero-search');
  search.value = 'ANA'; search.dispatchEvent(new window.Event('input', { bubbles: true }));
  count('#hero-cards .hero-card', 1); count('#hero-rows tr', 1);
  document.querySelector('#hero-cards [data-favorite="ana"]').click();
  for (const button of document.querySelectorAll('[data-favorite="ana"]')) assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(storage.load().keys, ['ana']);
  document.querySelector('[data-role="tank"]').click();
  count('#hero-cards .hero-card', 0); assert.equal(document.querySelector('#table-wrap').hidden, true);
  search.value = ''; search.dispatchEvent(new window.Event('input', { bubbles: true }));
  count('#hero-cards .hero-card', 1); count('#hero-rows tr', 1);
  assert.equal(requests, 1);
}));

test('removing a favorite preserves useful keyboard focus and empty state', async () => withDOM(async () => {
  const model = createHeroModel(['ana', 'dva']);
  Object.assign(model.state, { heroes, status: 'ready', favoritesOnly: true });
  const view = createHeroView(); view.render(model);
  document.querySelector('#hero-cards [data-favorite="ana"]').focus();
  const summary = document.querySelector('.cohort-banner .favorites-summary');
  assert(summary); assert.equal(document.querySelector('.sidebar #favorite-preview'), null);
  assert.equal(summary.querySelectorAll('[data-hero]').length, 2);
  assert(summary.textContent.includes('미분류'));
  model.state.favorites.delete('ana'); view.render(model);
  assert.equal(document.activeElement.dataset.favorite, 'dva');
  model.state.favorites.clear(); view.render(model);
  assert.match(summary.textContent, /즐겨찾기한 영웅이 여기에 표시됩니다/);
  assert.equal(document.activeElement.id, 'hero-search');
  assert.equal(document.querySelector('#table-wrap').hidden, true);
  assert.match(document.querySelector('#data-state').textContent, /첫 번째 영웅/);
}));

test('portrait failures retain fallback and detail content treats markup as text', async () => withDOM(async window => {
  const model = createHeroModel(); Object.assign(model.state, { heroes, status: 'ready' });
  const view = createHeroView(); view.render(model);
  const image = document.querySelector('#hero-cards img');
  const frame = image.parentElement;
  image.dispatchEvent(new window.Event('error'));
  assert.equal(frame.querySelector('img'), null); assert.equal(frame.textContent, '아');
  const dialog = document.querySelector('#hero-dialog');
  // jsdom has no layout/native modal implementation. Only our DOM contract is tested.
  dialog.showModal = () => dialog.setAttribute('open', '');
  dialog.close = () => { dialog.removeAttribute('open'); dialog.dispatchEvent(new window.Event('close')); };
  view.showDetail(heroes[2]);
  assert.equal(document.querySelector('#detail-name').textContent, '솔저: 76');
  assert.equal(document.querySelector('#detail-content img'), null);
  assert.match(document.querySelector('#detail-content p').textContent, /<img/);
  assert(document.documentElement.classList.contains('detail-open'));
  view.closeDetail(); assert(!document.documentElement.classList.contains('detail-open'));
}));

test('error and loading states hide both roster layouts', async () => withDOM(async () => {
  const model = createHeroModel(); const view = createHeroView();
  view.render(model); assert.equal(document.querySelector('#heroes').getAttribute('aria-busy'), 'true');
  assert.equal(document.querySelector('#table-wrap').hidden, true);
  Object.assign(model.state, { status: 'error', error: '연결 확인' }); view.render(model);
  assert.equal(document.querySelector('#table-wrap').hidden, true);
  assert.equal(document.querySelector('[data-action="retry"]').textContent, '다시 시도');
}));

test('mock: table/card/modal show identical actual-shaped metrics, including zero and null', async () => withDOM(async window => {
  const model = createHeroModel();
  Object.assign(model.state, { heroes, status: 'ready', statsStatus: 'ready', statistics: { filters: { ...DEFAULT_FILTERS }, records: normalizeStatistics([{ hero: 'ana', winrate: 52.3, pickrate: 0, banrate: null }]), fetchedAt: '2026-11-02T00:00:00Z' } });
  const view = createHeroView(); view.render(model);
  const cells = document.querySelector('#hero-rows [data-hero="ana"]').closest('tr').querySelectorAll('td');
  assert.equal(cells[0].textContent, '—');assert.equal(cells[3].textContent, '미분류'); assert.equal(cells[4].textContent, '52.3%'); assert.equal(cells[5].textContent, '0.0%'); assert.equal(cells[6].textContent, '미제공');
  assert.deepEqual([...document.querySelector('#hero-cards [data-hero="ana"]').closest('.hero-card').querySelectorAll('dd')].map(node => node.textContent), ['미분류', '52.3%', '0.0%', '미제공']);
  const dialog = document.querySelector('#hero-dialog'); dialog.showModal = () => dialog.setAttribute('open', '');
  view.showDetail(model.heroByKey('ana'), model.state);
  assert.deepEqual([...document.querySelectorAll('#detail-statistics dd')].map(node => node.textContent), ['미분류', '52.3%', '0.0%', '미제공']);
}));

test('cohort ordinals follow every existing sort and survive search/favorites without mutating source or filter state',()=>{
 const model=createHeroModel(['ana']);
 Object.assign(model.state,{heroes,status:'ready',statistics:{filters:{...DEFAULT_FILTERS},records:normalizeStatistics(heroes.map((h,i)=>({hero:h.key,winrate:51+i,pickrate:6+i,banrate:2+i})))}});
 const original=JSON.stringify(model.state.heroes);
 for(const sort of ['tier-desc','meta-desc','winrate-desc','pickrate-desc','banrate-desc','name-asc','name-desc']){
  Object.assign(model.state,{sort,query:'',favoritesOnly:false,role:'all'});
  const base=model.listSelection(),ana=base.ordinals.get('ana');assert.deepEqual(base.heroes.map(h=>h.key),model.visibleHeroes().map(h=>h.key));
  base.heroes.forEach((h,i)=>assert.equal(base.ordinals.get(h.key),i+1));
  model.state.query='ana';const search=model.listSelection();assert.equal(search.heroes.length,1);assert.equal(search.ordinals.get('ana'),ana);assert.equal(model.state.query,'ana');
  model.state.query='';model.state.favoritesOnly=true;const fav=model.listSelection();assert.equal(fav.heroes.length,1);assert.equal(fav.ordinals.get('ana'),ana);assert.equal(model.state.favoritesOnly,true);
 }
 assert.equal(JSON.stringify(model.state.heroes),original);
 Object.assign(model.state,{query:'',favoritesOnly:false,role:'support',sort:'tier-desc'});assert.equal(model.listSelection().ordinals.get('ana'),1);
 model.state.statsFilters={...DEFAULT_FILTERS,region:'europe'};assert(model.listSelection().heroes.every(h=>model.listSelection().ordinals.get(h.key)===null));
 model.state.statsFilters={...DEFAULT_FILTERS,division:'master'};assert.equal(model.listSelection().ordinals.get('ana'),null);
 model.state.sort='name-asc';assert.equal(model.listSelection().ordinals.get('ana'),1);assert.match(model.listSelection().label,/표시 순서/);
});

test('table and mobile cards share the same stable ordinal and accessible meaning',()=>withDOM(()=>{
 const model=createHeroModel(),view=createHeroView();Object.assign(model.state,{heroes,status:'ready',sort:'name-asc'});view.render(model);
 const expected=new Map([...document.querySelectorAll('#hero-rows tr')].map(row=>[row.querySelector('[data-hero]').dataset.hero,row.querySelector('.hero-ordinal').textContent]));
 for(const card of document.querySelectorAll('.hero-card')){const key=card.querySelector('[data-hero]').dataset.hero;assert.equal(card.querySelector('.hero-ordinal').textContent,expected.get(key));assert.match(card.querySelector('.hero-ordinal').getAttribute('aria-label'),/표시 순서/);}
 model.state.query='ana';view.render(model);assert.equal(document.querySelector('.hero-card .hero-ordinal').textContent,expected.get('ana'));
 model.state.sort='tier-desc';view.render(model);assert.equal(document.querySelector('.hero-card .hero-ordinal').textContent,'—');
}));

test('mock: changing cohort clears old values and ignores slow previous responses', async () => withDOM(async window => {
  const deferred = [];
  const model = createHeroModel(); const view = createHeroView();
  document.querySelector('#hero-dialog').close = () => {};
  const controller = createHeroController({ model, view, storage: createFavoritesStorage(() => window.localStorage), autoRefresh: false,
    service: { async getHeroes() { return { heroes }; } },
    statisticsService: { getStatistics(filters) { return new Promise(resolve => deferred.push({ filters, resolve })); } },
  });
  controller.start(); await new Promise(resolve => setImmediate(resolve));
  const region = document.querySelector('#stats-region'); region.value = 'europe'; region.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(model.state.statistics, null);
  deferred[1].resolve({ filters: deferred[1].filters, records: normalizeStatistics([{ hero: 'ana', winrate: 60 }]), fetchedAt: '2026-11-02T00:00:00Z', expiresAt: Date.now() + 3600000 });
  await new Promise(resolve => setImmediate(resolve));
  deferred[0].resolve({ filters: deferred[0].filters, records: normalizeStatistics([{ hero: 'ana', winrate: 40 }]), fetchedAt: '2026-11-02T00:00:00Z' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(model.heroByKey('ana').statistics.winRate, 60); assert.equal(model.state.statsFilters.region, 'europe');
  const mode = document.querySelector('#stats-mode'); model.state.statsFilters.division = 'gold'; mode.value = 'quickplay'; mode.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(model.state.statsFilters.division, 'all'); assert.equal(document.querySelector('#stats-division').disabled, true);
  assert.equal(model.state.statistics, null); controller.stop();
}));
