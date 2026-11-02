// Explicit opt-in, never part of normal offline npm test. Uses real public HTTPS requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatistics } from '../../src/models/statisticsModel.js';
import { normalizeHeroes } from '../../src/models/heroModel.js';

test('live HTTPS OverFast heroes/statistics and CORS headers', async () => {
  for (const [path, normalize] of [['/heroes?locale=ko-kr', normalizeHeroes], ['/heroes/stats?platform=pc&gamemode=competitive&region=asia', normalizeStatistics]]) {
    const response = await fetch(`https://overfast-api.tekrop.fr${path}`, { headers: { Origin: 'https://example.github.io' }, signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const records = normalize(await response.json()); assert(records.length > 0);
    console.log(JSON.stringify({ path, count: records.length, cache: response.headers.get('cache-control'), age: response.headers.get('age') }));
  }
});
