// Explicit opt-in, never part of normal offline npm test. Uses real public HTTPS requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatistics } from '../../src/models/statisticsModel.js';
import { normalizeHeroes } from '../../src/models/heroModel.js';
import { normalizeHeroDetail } from '../../src/models/heroDetailModel.js';
import { createStatisticsService } from '../../src/services/statisticsService.js';

test('live HTTPS OverFast heroes/statistics and CORS headers', async () => {
  for (const [path, normalize] of [['/heroes?locale=ko-kr', normalizeHeroes], ['/heroes/stats?platform=pc&gamemode=competitive&region=asia', normalizeStatistics]]) {
    const response = await fetch(`https://overfast-api.tekrop.fr${path}`, { headers: { Origin: 'https://example.github.io' }, signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const records = normalize(await response.json()); assert(records.length > 0);
    console.log(JSON.stringify({ path, count: records.length, cache: response.headers.get('cache-control'), age: response.headers.get('age') }));
  }
});

test('live HTTPS hero detail schema and CORS', async () => {
  const response = await fetch('https://overfast-api.tekrop.fr/heroes/genji?locale=ko-kr', { headers: { Origin: 'https://example.github.io' }, signal: AbortSignal.timeout(25000) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const detail = normalizeHeroDetail(await response.json(), 'genji');
  assert(detail.abilities.length > 0); assert.equal(detail.minor.length, 2); assert.equal(detail.major.length, 2);
  console.log(`Live Genji: ${detail.abilities.length} abilities, ${detail.minor.length}+${detail.major.length} perks, ${detail.backgrounds.length} backgrounds.`);
});

test('live default statistics cohort is explicitly Asia/PC/competitive/diamond', async () => {
  const service = createStatisticsService();
  const result = await service.getStatistics();
  assert.equal(result.filters.region, 'asia'); assert.equal(result.filters.division, 'diamond');
  assert.equal(result.filters.gamemode, 'competitive'); assert.equal(result.filters.platform, 'pc');
  assert(result.records.length > 0);
  console.log(`Live default diamond records: ${result.records.length}, fetchedAt=${result.fetchedAt}`);
});
