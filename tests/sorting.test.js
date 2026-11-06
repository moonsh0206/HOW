import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createHeroModel } from '../src/models/heroModel.js';
import { createHeroView } from '../src/views/heroView.js';
import { createHeroController } from '../src/controllers/heroController.js';
const evidence = JSON.parse(fs.readFileSync(new URL('../docs/research/tier-design/evidence.json', import.meta.url)));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function modelFor(division = 'all', region = 'asia') {
  const c = evidence.cases.find(c => c.filters.division === division && c.filters.region === region);
  const model = createHeroModel();
  Object.assign(model.state, { heroes: [...evidence.heroes.records, { key: 'missing', name: '누락', role: 'tank' }], statsFilters: c.filters, status: 'ready', statistics: { filters: c.filters, records: c.api.records.map(r => ({ hero: r.hero, winRate: r.winrate, pickRate: r.pickrate, banRate: r.banrate })) } });
  return model;
}
const names = (a, b) => a.name.localeCompare(b.name, 'ko') || a.key.localeCompare(b.key, 'en');
test('sorting: final tiers take precedence over higher capped scores; unclassified last', () => {
  const model = modelFor(); assert.equal(model.state.sort, 'tier-desc');
  const rows = model.visibleHeroes(), order = ['S', 'A', 'B', 'C', 'D', null];
  assert.equal(rows.at(-1).key, 'missing');
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]; assert(order.indexOf(a.tier) <= order.indexOf(b.tier));
    if (a.tier === b.tier) { assert(a.metaScore >= b.metaScore); if (a.metaScore === b.metaScore) assert(names(a, b) <= 0); }
  }
  const capped = rows.find(h => h.capped);
  const lowerS = rows.find(h => h.tier === 'S' && h.metaScore < capped.metaScore);
  assert(capped && lowerS); assert(rows.indexOf(lowerS) < rows.indexOf(capped));
  model.state.sort = 'meta-desc'; const scores = model.visibleHeroes();
  assert(scores.findIndex(h => h.key === capped.key) < scores.findIndex(h => h.key === lowerS.key));
});
test('sorting: all metric sorts preserve actual zero, put absent values last and use stable names', () => {
  const model = modelFor();
  for (const [sort, field] of [['winrate-desc', 'winRate'], ['pickrate-desc', 'pickRate'], ['banrate-desc', 'banRate'], ['meta-desc', 'metaScore']]) {
    model.state.sort = sort; const rows = model.visibleHeroes();
    const value = h => field === 'metaScore' ? h.metaScore : h.statistics?.[field];
    assert.equal(rows.at(-1).key, 'missing');
    for (let i = 1; i < rows.length - 1; i++) { assert(value(rows[i - 1]) >= value(rows[i])); if (value(rows[i - 1]) === value(rows[i])) assert(names(rows[i - 1], rows[i]) <= 0); }
  }
  for (const sort of ['name-asc', 'name-desc']) { model.state.sort = sort; const rows = model.visibleHeroes(); for (let i = 1; i < rows.length; i++) assert(names(rows[i - 1], rows[i]) * (sort === 'name-desc' ? -1 : 1) <= 0); }
  model.state.heroes = ['b', 'a', 'c'].map(key => ({ key, name: key === 'c' ? '나' : '가', role: 'tank' }));
  model.state.statistics.records = ['a', 'b'].map(hero => ({ hero, winRate: 50, pickRate: 0, banRate: 0 }));
  for (const sort of ['tier-desc', 'meta-desc', 'banrate-desc']) { model.state.sort = sort; assert.deepEqual(model.visibleHeroes().map(h => h.key), ['a', 'b', 'c']); }
});
test('DOM/controller sorting: combo, table and cards stay in sync through filters and refresh', async () => {
  const dom = new JSDOM(html, { url: 'https://example.github.io/HOW/' });
  const previous = { document: globalThis.document, window: globalThis.window, location: globalThis.location };
  Object.assign(globalThis, { document: dom.window.document, window: dom.window, location: dom.window.location });
  let controller;
  try {
    const model = modelFor(); const view = createHeroView();
    document.querySelector('#hero-dialog').close = () => {};
    controller = createHeroController({ model, view, storage: { save: () => true }, autoRefresh: false, service: { async getHeroes() { return { heroes: model.state.heroes }; } }, statisticsService: { async getStatistics(filters) {
      const source = modelFor(filters.division, filters.region); return { ...source.state.statistics, fetchedAt: new Date().toISOString() };
    } } });
    controller.start(); const flush = () => new Promise(resolve => setImmediate(resolve)); await flush();
    const check = () => {
      assert.equal(document.querySelector('#sort').value, model.state.sort);
      const combo=document.querySelector('#sort-trigger');assert.equal(combo.getAttribute('role'),'combobox');assert(combo.textContent.includes(document.querySelector('#sort option:checked').textContent));
      for (const container of ['#hero-rows', '#hero-cards']) assert.deepEqual([...document.querySelectorAll(`${container} [data-hero]`)].map(b => b.dataset.hero), model.visibleHeroes().map(h => h.key));
    };
    check(); assert.equal(document.querySelector('#sort option:checked').textContent, '기본 (HOW 티어순)');
    document.querySelector('#sort-trigger').click();assert.equal(document.querySelector('#sort-trigger').getAttribute('aria-expanded'),'true');document.querySelector('#sort-listbox [data-value=banrate-desc]').click();check();assert.equal(model.state.sort,'banrate-desc');assert.equal(document.querySelector('#sort-trigger').getAttribute('aria-expanded'),'false');
    document.querySelector('#sort-trigger').click();document.querySelector('#sort-listbox [data-value=tier-desc]').click();check();
    const change = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new dom.window.Event('change', { bubbles: true })); };
    change('#stats-division', 'diamond'); await flush(); check(); assert.equal(model.state.sort, 'tier-desc');
    change('#stats-region', 'americas'); await flush(); check(); assert.equal(model.state.sort, 'tier-desc');
    document.querySelector('[data-role="tank"]').click(); check(); assert.equal(model.state.sort, 'tier-desc');
    for (const sort of ['banrate-desc', 'meta-desc', 'winrate-desc', 'pickrate-desc', 'name-asc', 'name-desc', 'tier-desc']) { change('#sort', sort); check(); }
    model.state.sort = 'meta-desc'; view.render(model); check(); // Model changes also update the select.
    change('#stats-region', 'asia'); await flush(); check(); assert.equal(model.state.sort, 'meta-desc'); // Preserve an explicit user choice too.
  } finally { controller?.stop(); Object.assign(globalThis, previous); dom.window.close(); }
});
