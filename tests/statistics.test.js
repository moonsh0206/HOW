import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeStatistics, DEFAULT_FILTERS, statisticsQuery, validateFilters } from '../src/models/statisticsModel.js';
import { normalizeHeroes, createHeroModel } from '../src/models/heroModel.js';
import { roleTier, attachRoleTiers, calculateTierScore } from '../src/domain/tier.js';
import { createStatisticsService } from '../src/services/statisticsService.js';

const raw = [{ hero: 'ana', winrate: 50, pickrate: 20, banrate: 0 }];
const response = (data = raw) => ({ ok: true, json: async () => data, headers: new Headers() });
const heroes = normalizeHeroes([{ key: 'ana', name: '아나', role: 'support' }, { key: 'mercy', name: '메르시', role: 'support' }, { key: 'dva', name: 'D.Va', role: 'tank' }]);

test('mock: statistics null/omitted and actual zero remain distinct; invalid values rejected', () => {
  const [record] = normalizeStatistics([{ hero: 'ana', winrate: 0, pickrate: null }]);
  assert.equal(record.winRate, 0); assert.equal(record.pickRate, null); assert.equal(record.banRate, null);
  for (const value of [-1, 101, '50', NaN, Infinity]) assert.throws(() => normalizeStatistics([{ hero: 'ana', winrate: value }]));
  assert.throws(() => normalizeStatistics([...raw, ...raw])); assert.throws(() => normalizeStatistics({}));
  assert.equal(calculateTierScore({ winRate: 50 }), null);
});
test('mock: cumulative ceil boundaries and small groups, tie ranks and missing winrate', () => {
  assert.deepEqual([1, 3, 4, 6, 7, 10, 11, 15, 16, 20].map(rank => roleTier(rank, 20)), ['S', 'S', 'A', 'A', 'B', 'B', 'C', 'C', 'D', 'D']);
  for (let size = 1; size <= 6; size++) assert.equal(roleTier(1, size), 'S');
  assert.equal(roleTier(0, 0), null);
  const records = normalizeStatistics([...raw, { hero: 'mercy', winrate: 50 }, { hero: 'dva', winrate: 0 }]);
  const joined = attachRoleTiers(heroes, records);
  assert.deepEqual(joined.map(hero => [hero.roleRank, hero.tier]), [[1, 'S'], [1, 'S'], [1, 'S']]);
  assert.equal(attachRoleTiers(heroes, records.slice(0, 1))[1].tier, null);
});
test('mock: key joins, unknown records, role/search do not change assigned tiers, numeric sorting', () => {
  const model = createHeroModel(); model.state.heroes = heroes;
  model.state.statistics = { filters: { ...DEFAULT_FILTERS }, records: normalizeStatistics([...raw, { hero: 'mercy', winrate: 80, pickrate: 0 }, { hero: 'unknown-hero', winrate: 99 }]) };
  const original = model.heroByKey('ana').tier;
  model.state.role = 'support'; model.state.query = 'ana'; assert.equal(model.visibleHeroes()[0].tier, original);
  Object.assign(model.state, { query: '', role: 'all', sort: 'pickrate-desc' });
  assert.deepEqual(model.visibleHeroes().map(hero => hero.key), ['ana', 'mercy', 'dva']);
});
test('mock: filter enum checks and quickplay division constraints happen before fetch', async () => {
  assert.equal(statisticsQuery(DEFAULT_FILTERS), 'platform=pc&gamemode=competitive&region=asia&competitive_division=diamond');
  assert.equal(statisticsQuery({ ...DEFAULT_FILTERS, division: 'all' }), 'platform=pc&gamemode=competitive&region=asia');
  assert.throws(() => validateFilters({ gamemode: 'quickplay', division: 'gold' }));
  let called = false;
  const service = createStatisticsService({ fetcher: async () => { called = true; return response(); } });
  await assert.rejects(service.getStatistics({ region: 'moon' })); assert.equal(called, false);
});
test('mock: exact-key pending/cache, expiry, stale fallback and cooldown do not mix cohorts', async () => {
  let now = 0, calls = 0, fail = false;
  const service = createStatisticsService({ now: () => now, ttlMs: 60000, fetcher: async () => { calls++; return fail ? { ok: false, status: 503, headers: new Headers({ 'retry-after': '120' }) } : response(); } });
  const [a, b] = await Promise.all([service.getStatistics(DEFAULT_FILTERS), service.getStatistics(DEFAULT_FILTERS)]);
  assert.equal(a, b); await service.getStatistics(DEFAULT_FILTERS); assert.equal(calls, 1);
  now = 60001; fail = true;
  const stale = await service.getStatistics(DEFAULT_FILTERS);
  assert.equal(stale.stale, true); assert.equal(stale.fetchedAt, a.fetchedAt); assert.match(stale.error, /503/);
  await service.getStatistics(DEFAULT_FILTERS); assert.equal(calls, 2);
  await assert.rejects(service.getStatistics({ region: 'europe' }), /503/);
  assert.equal(calls, 3);
});
test('mock: HTTP errors, invalid JSON/data, timeout and network failures', async () => {
  for (const status of [429, 503, 400, 422]) {
    const service = createStatisticsService({ fetcher: async () => ({ ok: false, status, headers: new Headers() }) });
    await assert.rejects(service.getStatistics(), new RegExp(String(status)));
  }
  await assert.rejects(createStatisticsService({ fetcher: async () => response([{ hero: 'ana', winrate: 200 }]) }).getStatistics(), /0~100/);
  await assert.rejects(createStatisticsService({ fetcher: async () => { throw new TypeError('Failed to fetch'); } }).getStatistics(), /CORS/);
  await assert.rejects(createStatisticsService({ fetcher: async () => ({ ok: true, json: async () => { throw new SyntaxError(); } }) }).getStatistics(), /JSON/);
  const timeout = createStatisticsService({ timeoutMs: 5, fetcher: (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')))) });
  await assert.rejects(timeout.getStatistics(), /초과/);
});
test('captured real API response: shapes, ranges, key matching and role tier construction', async () => {
  const capturedHeroes = normalizeHeroes(JSON.parse(await readFile(new URL('./fixtures/overfast-heroes.json', import.meta.url), 'utf8')));
  const records = normalizeStatistics(JSON.parse(await readFile(new URL('./fixtures/overfast-stats.json', import.meta.url), 'utf8')));
  assert(records.length > 0); assert(capturedHeroes.length > 0);
  const keys = new Set(capturedHeroes.map(hero => hero.key));
  assert(records.every(record => keys.has(record.hero)));
  const joined = attachRoleTiers(capturedHeroes, records);
  for (const role of ['tank', 'damage', 'support']) assert(joined.some(hero => hero.role === role && hero.tier === 'S'));
  assert(records.some(record => record.banRate === 0));
});
