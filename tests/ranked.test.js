import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { DEFAULT_FILTERS, ALL_RANK_FILTERS, DIVISIONS, DIVISION_GROUPS, statisticsQuery, normalizeStatistics, validateFilters } from '../src/models/statisticsModel.js';
import { normalizeHeroes, createHeroModel } from '../src/models/heroModel.js';
import { attachMetaTiers } from '../src/domain/meta.js';
import { compareHeroCohorts } from '../src/domain/cohortComparison.js';
import { classifyMeta } from '../src/domain/insights.js';
import { createStatisticsService } from '../src/services/statisticsService.js';
import { createHeroView } from '../src/views/heroView.js';
import { createHeroController } from '../src/controllers/heroController.js';
import { createFavoritesStorage } from '../src/storage/favoritesStorage.js';
import { createSnapshotService } from '../src/services/snapshotService.js';

const evidence = JSON.parse(await readFile(new URL('./fixtures/ranked-cohorts.json', import.meta.url), 'utf8'));
const heroes = normalizeHeroes(JSON.parse(await readFile(new URL('./fixtures/overfast-heroes.json', import.meta.url), 'utf8')));
const cohort = (division, region = 'asia') => {
  const item = evidence.cases.find(item => item.filters.division === division && item.filters.region === region);
  return { ...item, records: normalizeStatistics(item.raw) };
};

test('rank filters: Asia/PC/competitive/diamond default, grouped individual enums, champion not standalone', () => {
  assert.deepEqual(DEFAULT_FILTERS, { platform: 'pc', gamemode: 'competitive', region: 'asia', division: 'diamond', map: 'all' });
  assert.equal(ALL_RANK_FILTERS.division, 'all');
  assert.match(statisticsQuery(DEFAULT_FILTERS), /competitive_division=diamond/);
  assert(!statisticsQuery(ALL_RANK_FILTERS).includes('competitive_division'));
  assert.deepEqual(DIVISION_GROUPS.flatMap(group => group.keys), Object.keys(DIVISIONS));
  for (const division of ['champion', 'mid', 'top500']) assert.throws(() => validateFilters({ division }));
  assert.throws(() => validateFilters({ region: 'korea' }));
});
test('captured API: all eight individual ranks supported; GM schema explicitly includes champion', () => {
  assert.deepEqual(evidence.divisionSchema.enum, Object.keys(DIVISIONS).filter(key => key !== 'all'));
  assert.match(evidence.divisionSchema.description, /includes.*champion/);
  assert.equal(evidence.unsupportedProbe.status, 422);
  for (const division of Object.keys(DIVISIONS)) {
    const item = cohort(division);
    assert.equal(item.status, 200); assert.equal(item.records.length, 54); assert.equal(item.cors, '*');
    assert.equal(new URL(item.endpoint).searchParams.get('competitive_division'), division === 'all' ? null : division);
  }
});
test('captured API: Asia versus Americas and all/diamond/master/GM are distinct populations', () => {
  const diamond = cohort('diamond');
  for (const other of [cohort('diamond', 'americas'), cohort('all'), cohort('master'), cohort('grandmaster')]) {
    assert.notEqual(statisticsQuery(diamond.filters), statisticsQuery(other.filters));
    assert.notDeepEqual(diamond.records, other.records);
  }
});
test('captured API: Domina and Winston tied winrates are separated by role pick percentiles', () => {
  const scored = attachMetaTiers(heroes, cohort('diamond').records);
  const domina = scored.find(hero => hero.key === 'domina'), winston = scored.find(hero => hero.key === 'winston');
  assert.equal(domina.statistics.winRate, winston.statistics.winRate);
  assert.equal(domina.statistics.pickRate, 4.8); assert.equal(winston.statistics.pickRate, 15.3);
  assert.equal(domina.winPercentile, winston.winPercentile);
  assert.equal(domina.roleRank, 4); assert.equal(domina.tier, 'A'); assert.equal(winston.roleRank, 1);
  assert(Math.abs(domina.metaScore - 70.8928571429) < 1e-8);
});
test('rank comparison: independent row calculation and model prevents explicitly mismatched cohort data', () => {
  const inputs = ['gold', 'emerald', 'diamond', 'master'].map(division => cohort(division));
  const rows = compareHeroCohorts('genji', heroes, inputs);
  rows.forEach((row, index) => assert.equal(row.hero.metaScore, attachMetaTiers(heroes, inputs[index].records).find(hero => hero.key === 'genji').metaScore));
  assert.throws(() => compareHeroCohorts('genji', heroes, [inputs[0], inputs[0]]));
  const model = createHeroModel(); model.state.heroes = heroes; model.state.statistics = cohort('all');
  assert(model.enrichedHeroes().every(hero => hero.tier === null));
  model.state.statistics = cohort('diamond'); assert(model.heroByKey('genji').tier);
  model.state.statistics = { records: cohort('diamond').records }; assert.equal(model.heroByKey('genji').tier, null);
});
test('rank cache: identical keys deduplicate; Asia/all/diamond/master/GM/Americas stay separate', async () => {
  const calls = [];
  const service = createStatisticsService({ fetcher: async url => {
    calls.push(url); const params = new URL(url).searchParams;
    const item = cohort(params.get('competitive_division') ?? 'all', params.get('region'));
    return { ok: true, headers: new Headers(), json: async () => item.raw };
  } });
  for (const input of [cohort('all'), cohort('diamond'), cohort('master'), cohort('grandmaster'), cohort('diamond', 'americas')]) {
    const result = await service.getStatistics(input.filters);
    assert.deepEqual(result.records, input.records); assert.deepEqual(result.filters, input.filters);
  }
  await Promise.all([service.getStatistics(DEFAULT_FILTERS), service.getStatistics(DEFAULT_FILTERS)]);
  assert.equal(calls.length, 5);
});
test('classification: high win, popular and contested leaders are distinct metrics; absent ban is not zero', () => {
  const data = attachMetaTiers(heroes, cohort('diamond').records);
  const classification = classifyMeta(data);
  for (const [kind, field] of [['highWinRate', 'winRate'], ['popularPicks', 'pickRate'], ['contestedPicks', 'banRate']]) {
    for (const leader of classification[kind]) assert.equal(leader.statistics[field], Math.max(...data.filter(hero => hero.role === leader.role).map(hero => hero.statistics[field] ?? -Infinity)));
  }
  assert.equal(classifyMeta([{ key: 'x', role: 'tank', statistics: { winRate: 50, pickRate: 0, banRate: null } }]).contestedPicks.length, 0);
  const incomplete = attachMetaTiers(heroes, [{ hero: 'domina', winRate: 99, pickRate: null, banRate: 80 }]);
  assert.equal(incomplete.find(hero => hero.key === 'domina').tier, null);
});
test('real published history: all-rank snapshots do not become diamond history when UI defaults change', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/data/snapshots/index.json', import.meta.url), 'utf8'));
  assert(manifest.snapshots.some(entry => entry.filters.division === 'all'));
  assert(manifest.snapshots.every(entry=>['all','diamond'].includes(entry.filters.division)));
  let calls = 0;
  const service = createSnapshotService({ fetcher: async () => { calls++; return { ok: true, json: async () => manifest }; } });
  assert.equal(await service.getPrevious(DEFAULT_FILTERS, '2026-11-02T12:00:00Z'), null);
  assert.equal(calls, 1);
});
test('DOM rank selection: accessible optgroups, diamond default, changed rank applies before slower all response', async () => {
  const dom = new JSDOM(await readFile(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://example.github.io/HOW/' });
  const prior = { window: globalThis.window, document: globalThis.document, location: globalThis.location };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, location: dom.window.location });
  let controller;
  try {
    const pending = []; const model = createHeroModel(); const view = createHeroView();
    document.querySelector('#hero-dialog').close = () => {};
    controller = createHeroController({ model, view, storage: createFavoritesStorage(() => window.localStorage), autoRefresh: false,
      service: { async getHeroes() { return { heroes }; } },
      statisticsService: { getStatistics(filters) { return new Promise(resolve => pending.push({ filters, resolve })); } },
    });
    controller.start(); await new Promise(resolve => setImmediate(resolve));
    const select = document.querySelector('#stats-division');
    assert.equal(select.value, 'diamond'); assert.equal(select.querySelectorAll('optgroup').length, 4);
    assert.match(select.querySelector('[value="grandmaster"]').textContent, /챔피언/);
    select.value = 'all'; select.dispatchEvent(new window.Event('change', { bubbles: true }));
    select.value = 'master'; select.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(model.state.statistics, null); assert.match(document.querySelector('#active-cohort').textContent, /마스터/);
    pending[2].resolve(cohort('master')); await new Promise(resolve => setImmediate(resolve));
    const score = model.heroByKey('domina').metaScore;
    pending[1].resolve(cohort('all')); pending[0].resolve(cohort('diamond'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(model.state.statsFilters.division, 'master'); assert.equal(model.heroByKey('domina').metaScore, score);
    assert.equal(model.state.statistics.filters.division, 'master');
  } finally { controller?.stop(); dom.window.close(); Object.assign(globalThis, prior); }
});
