import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attachMetaTiersV1 as attachMetaTiers, percentile } from '../src/domain/meta.js';
import { attachRoleTiers } from '../src/domain/tier.js';
import { hotHeroes, hiddenGems } from '../src/domain/insights.js';
import { DEFAULT_FILTERS, normalizeStatistics } from '../src/models/statisticsModel.js';
import { normalizeHeroes } from '../src/models/heroModel.js';

const heroes = ['a', 'b', 'c', 'd'].map(key => ({ key, name: key, role: 'support' }));
const records = [60, 59, 58, 57].map((winRate, index) => ({ hero: heroes[index].key, winRate, pickRate: [.5, 30, 20, 10][index], banRate: null }));
test('meta: percentiles use average ties and neutral single/all-equal groups', () => {
  assert.equal(percentile(1, [1, 2, 3]), 0); assert.equal(percentile(3, [1, 2, 3]), 100);
  assert.equal(percentile(2, [1, 2, 2, 3]), 50); assert.equal(percentile(2, [2]), 50);
  assert.equal(percentile(2, [2, 2, 2]), 50); assert.equal(percentile(null, [2]), null);
});
test('meta: weighted percentiles can change tier versus preserved win-only policy', () => {
  const old = attachRoleTiers(heroes, records); const meta = attachMetaTiers(heroes, records);
  assert.equal(old[0].tier, 'S'); assert.equal(meta[1].tier, 'S'); assert.equal(meta[0].tier, 'A');
  assert.equal(meta[0].metaScore, 70); assert.equal(meta[0].lowPick, true);
  assert(meta[1].metaScore > meta[0].metaScore);
  assert.throws(() => attachMetaTiers(heroes, records, { weights: { winRate: .8, pickRate: .8 } }));
});
test('meta: complete-case cohort, zero, missing and tied score policy are deterministic', () => {
  const result = attachMetaTiers([...heroes, { key: 'tank', role: 'tank' }], [{ hero: 'a', winRate: 50, pickRate: 0 }, { hero: 'b', winRate: 50, pickRate: 0 }, { hero: 'c', winRate: 90, pickRate: null }]);
  assert.equal(result[0].metaScore, 50); assert.equal(result[0].tier, 'S'); assert.equal(result[1].tier, 'S');
  assert.equal(result[2].tier, null); assert.equal(result[4].tier, null);
  assert.deepEqual(attachMetaTiers(heroes.slice().reverse(), records).map(hero => [hero.key, hero.metaScore]).sort(), attachMetaTiers(heroes, records).map(hero => [hero.key, hero.metaScore]).sort());
});
test('insights: gems use current role-relative rules and exclude extremely low picks', () => {
  const low = attachMetaTiers(heroes, records); assert.deepEqual(hiddenGems(low), []);
  const valid = attachMetaTiers(heroes, records.map(record => record.hero === 'a' ? { ...record, pickRate: 2 } : record));
  assert.deepEqual(hiddenGems(valid).map(hero => hero.key), ['a']);
  assert.deepEqual(hiddenGems(valid.slice(0, 2)), []);
});
test('insights: HOT requires same cohort, real history, interval and non-decreasing winrate', () => {
  const current = { source: 'OverFast API', filters: {...DEFAULT_FILTERS,division:'diamond'}, fetchedAt: '2026-11-03T06:00:00Z' };
  const previous = { source: 'OverFast API', filters: {...DEFAULT_FILTERS,division:'diamond'}, collectedAt: '2026-11-02T00:00:00Z', records: records.map(record => ({ ...record, pickRate: record.pickRate - 2, winRate: record.winRate - 1 })) };
  const joined = attachMetaTiers(heroes, records);
  const trend = hotHeroes(joined, current, previous);
  assert.equal(trend.available, true); assert.equal(trend.heroes[0].pickDelta, 2); assert.equal(trend.heroes[0].winDelta, 1);
  for (const prior of [null, { ...previous, filters: { ...DEFAULT_FILTERS, region: 'europe' } }, { ...previous, collectedAt: current.fetchedAt }]) assert.equal(hotHeroes(joined, current, prior).available, false);
  assert.equal(hotHeroes(joined, { ...current, stale: true }, previous).available, false);
  const declining = { ...previous, records: records.map(record => ({ ...record, pickRate: 0, winRate: 99 })) };
  assert.equal(hotHeroes(joined, current, declining).heroes.length, 0);
});
test('captured real response: meta scoring versus win-only comparison has valid ranges', async () => {
  const heroes = normalizeHeroes(JSON.parse(await readFile(new URL('./fixtures/overfast-heroes.json', import.meta.url), 'utf8')));
  const stats = normalizeStatistics(JSON.parse(await readFile(new URL('./fixtures/overfast-stats.json', import.meta.url), 'utf8')));
  const old = attachRoleTiers(heroes, stats); const meta = attachMetaTiers(heroes, stats);
  assert(meta.every(hero => hero.metaScore >= 0 && hero.metaScore <= 100));
  const changes = meta.filter((hero, index) => hero.tier !== old[index].tier).length;
  assert(changes > 0); console.log(`Captured real cohort: ${changes}/${meta.length} tier assignments differ from win-only.`);
});
