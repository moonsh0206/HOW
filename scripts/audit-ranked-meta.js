// Opt-in public API audit. Test evidence only; never imported by the frontend.
import { readFile, writeFile } from 'node:fs/promises';
import { normalizeStatistics, statisticsQuery, DIVISIONS } from '../src/models/statisticsModel.js';
const path = new URL('../tests/fixtures/ranked-cohorts.json', import.meta.url);
if (process.argv.includes('--fetch')) {
  const schemaResponse = await fetch('https://overfast-api.tekrop.fr/openapi.json', { signal: AbortSignal.timeout(25000) });
  if (!schemaResponse.ok) throw new Error(`Schema HTTP ${schemaResponse.status}`);
  const schema = await schemaResponse.json();
  const evidence = { collectedAt: new Date().toISOString(), source: 'OverFast API', divisionSchema: schema.components.schemas.CompetitiveDivisionFilter, cases: [] };
  const conditions = Object.keys(DIVISIONS).map(division => ({ platform: 'pc', gamemode: 'competitive', region: 'asia', division, map: 'all' }));
  conditions.push({ platform: 'pc', gamemode: 'competitive', region: 'americas', division: 'diamond', map: 'all' });
  for (const filters of conditions) {
    const endpoint = `https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(filters)}`;
    const response = await fetch(endpoint, { headers: { Origin: 'https://example.github.io' }, signal: AbortSignal.timeout(25000) });
    const raw = await response.json();
    if (response.ok) normalizeStatistics(raw);
    evidence.cases.push({ filters, endpoint, fetchedAt: new Date().toISOString(), status: response.status, cors: response.headers.get('access-control-allow-origin'), cacheControl: response.headers.get('cache-control'), raw });
    console.log(`${filters.region}/${filters.division}: HTTP ${response.status}, ${Array.isArray(raw) ? raw.length : 0} records`);
    if ([429, 503].includes(response.status)) break;
  }
  await writeFile(path, JSON.stringify(evidence, null, 2) + '\n');
} else {
  const evidence = JSON.parse(await readFile(path, 'utf8'));
  console.log(`Captured at ${evidence.collectedAt}: ${evidence.cases.length} independent cohorts`);
}
if (process.argv.includes('--probe-unsupported')) {
  const evidence = JSON.parse(await readFile(path, 'utf8'));
  const endpoint = 'https://overfast-api.tekrop.fr/heroes/stats?platform=pc&gamemode=competitive&region=asia&competitive_division=champion';
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(25000) });
  evidence.unsupportedProbe = { endpoint, status: response.status, fetchedAt: new Date().toISOString(), response: await response.json() };
  await writeFile(path, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`champion standalone probe: HTTP ${response.status}`);
}
