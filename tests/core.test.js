import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTierScore, tierByPercent } from '../src/domain/tier.js';
import { normalizeHeroes, createHeroModel } from '../src/models/heroModel.js';
import { createFavoritesStorage } from '../src/storage/favoritesStorage.js';
import { createOverfastService } from '../src/services/heroService.js';

const fixture = [{ key: 'ana', name: '아나', role: 'support', portrait: 'https://example.com/ana.png' }, { key: 'dva', name: 'D.Va', role: 'tank' }];
test('tier boundaries preserve plan; missing or invalid statistics never produce a tier score', () => {
  assert.equal(calculateTierScore(), null);
  assert.equal(calculateTierScore({ winRate: null, playTime: 20 }), null);
  assert.equal(calculateTierScore({ winRate: 101, playTime: 20 }), null);
  assert.equal(calculateTierScore({ winRate: 50, playTime: 9 }), Math.log(10) / 2);
  assert.deepEqual([15, 16, 30, 31, 50, 51, 75, 76, 100].map(rank => tierByPercent(rank, 100)), ['S', 'A', 'A', 'B', 'B', 'C', 'C', 'D', 'D']);
  assert.equal(tierByPercent(0, 0), null);
});
test('provider normalization rejects invalid records and unsafe image URLs', () => {
  assert.throws(() => normalizeHeroes({}));
  assert.throws(() => normalizeHeroes([{ key: '<script>', name: 'bad', role: 'tank' }]));
  assert.throws(() => normalizeHeroes([...fixture, fixture[0]]));
  const heroes = normalizeHeroes([{ ...fixture[0], portrait: 'javascript:alert(1)', winRate: 99 }]);
  assert.equal(heroes[0].portrait, ''); assert.equal(heroes[0].statistics, null);
});
test('search, roles, ordering and favorites combine without changing source data', () => {
  const model = createHeroModel(['ana']); model.state.heroes = normalizeHeroes(fixture);
  model.state.query = 'ANA'; assert.equal(model.visibleHeroes()[0].key, 'ana');
  model.state.role = 'tank'; assert.equal(model.visibleHeroes().length, 0);
  Object.assign(model.state, { query: '', role: 'all', favoritesOnly: true });
  assert.deepEqual(model.visibleHeroes().map(hero => hero.key), ['ana']);
  assert.equal(model.state.heroes.length, 2);
});
test('storage handles malformed data and blocked storage', () => {
  const blocked = createFavoritesStorage(() => { throw new Error('denied'); });
  assert.equal(blocked.load().available, false); assert.equal(blocked.save(new Set(['ana'])), false);
  assert.deepEqual(createFavoritesStorage(() => ({ getItem: () => '{broken' })).load().keys, []);
  assert.deepEqual(createFavoritesStorage(() => ({ getItem: () => '["ana","ana"]' })).load().keys, ['ana']);
});
test('concurrent and repeated list loads share a request and cache normalized results', async () => {
  let calls = 0;
  const service = createOverfastService({ fetcher: async () => { calls++; return { ok: true, json: async () => fixture }; } });
  const [a, b] = await Promise.all([service.getHeroes(), service.getHeroes()]);
  assert.equal(a, b); await service.getHeroes(); assert.equal(calls, 1);
});
test('failed requests can retry and timeout returns an actionable message', async () => {
  let calls = 0;
  const retry = createOverfastService({ fetcher: async () => { calls++; if (calls === 1) return { ok: false, status: 429 }; return { ok: true, json: async () => [] }; } });
  await assert.rejects(retry.getHeroes(), /요청이 많/); assert.deepEqual((await retry.getHeroes()).heroes, []);
  const timeout = createOverfastService({ timeoutMs: 5, fetcher: (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))) });
  await assert.rejects(timeout.getHeroes(), /시간이 초과/);
});
