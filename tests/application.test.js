import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createHeroModel, normalizeHeroes } from '../src/models/heroModel.js';
import { normalizeStatistics, DEFAULT_FILTERS } from '../src/models/statisticsModel.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createHeroView } from '../src/views/heroView.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { createInsightView } from '../src/views/insightView.js';
import { createHeroController } from '../src/controllers/heroController.js';
import { createRoutingController } from '../src/controllers/routingController.js';
import { createFavoritesStorage } from '../src/storage/favoritesStorage.js';

const read = async name => JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
test('captured-data DOM integration: direct page, statistics, favorite persistence and list navigation', async () => {
  const dom = new JSDOM(await readFile(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://example.github.io/HOW/#/heroes/genji' });
  const original = { window: globalThis.window, document: globalThis.document, location: globalThis.location };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, location: dom.window.location });
  let router, controller;
  try {
    const heroes = normalizeHeroes(await read('overfast-heroes'));
    const records = normalizeStatistics(await read('overfast-stats'));
    const detail = normalizeHeroDetail(await read('overfast-genji'), 'genji');
    const model = createHeroModel(); const view = createHeroView(); const insight = createInsightView();
    model.state.statsFilters = { ...DEFAULT_FILTERS, division: 'all' }; // Captured fixture is explicitly all-rank.
    const storage = createFavoritesStorage(() => window.localStorage);
    router = createRoutingController({ model, detailView: createHeroDetailView(), detailService: { async getHero() { return { detail, fetchedAt: '2026-11-02T00:00:00Z' }; } } });
    router.start();
    controller = createHeroController({ model, view, storage, autoRefresh: false,
      service: { async getHeroes() { return { heroes }; } },
      statisticsService: { async getStatistics() { return { records, filters: { ...DEFAULT_FILTERS, division: 'all' }, source: 'OverFast API', fetchedAt: '2026-11-02T06:00:00Z' }; } },
      snapshotService: { async getPrevious() { return null; } },
      onStateChange() { router.refresh(); insight.render(model); },
      onHeroSelect(key) { location.hash = `/heroes/${key}`; },
    });
    controller.start(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(document.querySelector('#hero-detail-page').hidden, false);
    assert.equal(document.querySelector('#hero-detail-page h1').textContent, detail.name);
    assert(document.querySelector('#detail-page-statistics').textContent.includes(model.heroByKey('genji').statistics.winRate.toFixed(1) + '%'));
    document.querySelector('#hero-detail-page [data-favorite="genji"]').click();
    assert.deepEqual(storage.load().keys, ['genji']);
    assert.equal(document.activeElement.id === 'hero-search', false);
    location.hash = '#favorites'; window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    assert.equal(document.querySelector('#list-page').hidden, false);
    assert.equal(document.querySelectorAll('#hero-cards .hero-card').length, 1);
    assert.equal(document.querySelector('#hero-cards [data-favorite="genji"]').getAttribute('aria-pressed'), 'true');
    document.querySelector('#hero-cards [data-hero="genji"]').click(); window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(document.querySelector('#hero-detail-page .detail-back').getAttribute('href'), '#favorites');
    assert.equal(document.querySelectorAll('#hot-content .insight-hero').length, 0);
  } finally { controller?.stop(); router?.stop(); dom.window.close(); Object.assign(globalThis, original); }
});
