import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createHeroDetailService } from '../src/services/heroDetailService.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { createRoutingController, parseRoute } from '../src/controllers/routingController.js';
import { createHeroModel } from '../src/models/heroModel.js';

const raw = JSON.parse(await readFile(new URL('./fixtures/overfast-genji.json', import.meta.url), 'utf8'));
const detail = normalizeHeroDetail(raw, 'genji');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
async function withDOM(callback) {
  const dom = new JSDOM(html, { url: 'https://example.github.io/HOW/#/heroes/genji' });
  const prior = { document: globalThis.document, window: globalThis.window, location: globalThis.location };
  Object.assign(globalThis, { document: dom.window.document, window: dom.window, location: dom.window.location });
  try { await callback(dom.window); } finally { dom.window.close(); Object.assign(globalThis, prior); }
}
test('captured detail: abilities, two minor/two major, backgrounds, no inferred passives', () => {
  assert.equal(detail.abilities.length, 5); assert.equal(detail.minor.length, 2); assert.equal(detail.major.length, 2);
  assert(detail.backgrounds.some(image => image.sizes.includes('lg')));
  assert.equal(detail.passiveClassification, 'unavailable');
  const unsafe = normalizeHeroDetail({ ...raw, abilities: [{ name: '<script>', description: '<img>', icon: 'javascript:alert(1)' }] }, 'genji');
  assert.equal(unsafe.abilities[0].icon, ''); assert.equal(unsafe.abilities[0].video, null);
  assert.throws(() => normalizeHeroDetail({ ...raw, abilities: {} }, 'genji'));
});
test('detail service: pending sharing, 24h cache and errors/timeouts', async () => {
  let calls = 0;
  const service = createHeroDetailService({ fetcher: async () => { calls++; return { ok: true, json: async () => raw }; } });
  const [a, b] = await Promise.all([service.getHero('genji'), service.getHero('genji')]);
  assert.equal(a, b); await service.getHero('genji'); assert.equal(calls, 1);
  await assert.rejects(service.getHero('../bad'));
  for (const status of [404, 429, 503]) await assert.rejects(createHeroDetailService({ fetcher: async () => ({ ok: false, status }) }).getHero('genji'), new RegExp(String(status)));
  await assert.rejects(createHeroDetailService({ timeoutMs: 5, fetcher: (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))) }).getHero('genji'), /초과/);
});
test('hash router: direct links, tabs, unknown paths and safe key validation', () => {
  assert.deepEqual(parseRoute('#/heroes/genji'), { page: 'detail', key: 'genji', tab: 'overview' });
  assert.equal(parseRoute('#/heroes/genji/perks').tab, 'perks');
  assert.equal(parseRoute('#/heroes/%3Cscript%3E').page, 'not-found');
  assert.equal(parseRoute('#favorites').page, 'list');
});
test('DOM: direct detail boot, real abilities/perks, tabs, safe text and no fake choice rates', async () => withDOM(async window => {
  const model = createHeroModel(); model.state.heroes = [{ ...detail }];
  const view = createHeroDetailView(); const router = createRoutingController({ model, detailView: view, detailService: { async getHero() { return { detail, fetchedAt: '2026-11-02T00:00:00Z' }; } } });
  router.start(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(document.querySelector('#list-page').hidden, true); assert.equal(document.querySelector('#hero-detail-page').hidden, false);
  assert.equal(document.querySelector('#hero-detail-page h1').textContent, raw.name);
  assert.equal(document.querySelectorAll('#detail-abilities .ability-card').length, 5);
  assert.equal(document.querySelectorAll('#detail-minor .ability-card').length, 2);
  assert.equal(document.querySelectorAll('#detail-major .ability-card').length, 2);
  assert.match(document.querySelector('#detail-passives').textContent, /구분 필드/);
  assert.match(document.querySelector('#detail-perk-rates').textContent, /미제공/);
  assert(document.querySelectorAll('#detail-abilities video').length > 0);
  location.hash = '#/heroes/genji/perks'; window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  assert.equal(document.querySelector('#detail-abilities').hidden, true); assert.equal(document.querySelector('#detail-minor').hidden, false);
  model.state.favorites.add('genji'); router.refresh(); assert.equal(document.querySelector('#hero-detail-page [data-favorite]').getAttribute('aria-pressed'), 'true');
  location.hash = '#heroes'; window.dispatchEvent(new window.HashChangeEvent('hashchange')); assert.equal(document.querySelector('#list-page').hidden, false);
  router.stop();
}));
test('DOM: detail routing ignores a late response after leaving the page', async () => withDOM(async window => {
  let resolve;
  const router = createRoutingController({ model: createHeroModel(), detailView: createHeroDetailView(), detailService: { getHero() { return new Promise(done => { resolve = done; }); } } });
  router.start(); location.hash = '#heroes'; window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  resolve({ detail, fetchedAt: '2026-11-02T00:00:00Z' }); await new Promise(done => setImmediate(done));
  assert.equal(document.querySelector('#hero-detail-page').hidden, true); router.stop();
}));

test('DOM: detail rendering never interprets external text as markup', async () => withDOM(async () => {
  const malicious = normalizeHeroDetail({ ...raw, name: '<script>alert(1)</script>', abilities: [{ name: '<b>name</b>', description: '<img src=x onerror=alert(1)>', icon: 'javascript:alert(1)' }], perks: { minor: [], major: [] } }, 'genji');
  const view = createHeroDetailView();
  view.render({ status: 'ready', result: { detail: malicious, fetchedAt: '2026-11-02T00:00:00Z' } }, createHeroModel(), { key: 'genji', tab: 'overview' });
  assert.equal(document.querySelector('#hero-detail-page h1').textContent, '<script>alert(1)</script>');
  assert.equal(document.querySelector('#hero-detail-page script'), null);
  assert.equal(document.querySelector('#detail-abilities img'), null);
  assert.match(document.querySelector('#detail-abilities p').textContent, /<img/);
}));
