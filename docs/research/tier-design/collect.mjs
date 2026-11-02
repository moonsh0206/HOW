// Research-only. Reads public pages/API; writes analysis evidence, never application data.
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const root = new URL('./', import.meta.url);
const cases = [
  ['asia', 'all'], ['asia', 'gold'], ['asia', 'emerald'], ['asia', 'diamond'],
  ['asia', 'master'], ['asia', 'grandmaster'], ['americas', 'diamond'], ['europe', 'diamond'],
];
const output = { collectedAt: new Date().toISOString(), cases: [] };
for (const [region, division] of cases) {
  const title = value => value[0].toUpperCase() + value.slice(1);
  const officialURL = `https://overwatch.blizzard.com/ko-kr/rates/?${new URLSearchParams({ input: 'PC', map: 'all-maps', region: title(region), role: 'All', rq: '1', tier: title(division) })}`;
  const apiURL = `https://overfast-api.tekrop.fr/heroes/stats?${new URLSearchParams({ platform: 'pc', gamemode: 'competitive', region, ...(division === 'all' ? {} : { competitive_division: division }) })}`;
  const entry = { filters: { platform: 'pc', gamemode: 'competitive', region, division, map: 'all' } };
  const api = await fetch(apiURL, { signal: AbortSignal.timeout(25000), headers: { Origin: 'https://example.github.io' } });
  const apiRaw = await api.json();
  entry.api = { url: apiURL, status: api.status, fetchedAt: new Date().toISOString(), age: api.headers.get('age'), cacheControl: api.headers.get('cache-control'), cors: api.headers.get('access-control-allow-origin'), records: apiRaw };
  if ([429, 503].includes(api.status)) { output.cases.push(entry); break; }
  const page = await fetch(officialURL, { signal: AbortSignal.timeout(25000) });
  const html = await page.text();
  entry.official = { url: officialURL, status: page.status, fetchedAt: new Date().toISOString() };
  if (page.ok) {
    const doc = new JSDOM(html).window.document;
    entry.official.selected = Object.fromEntries([...doc.querySelectorAll('select[data-label]')].map(select => [select.dataset.label, select.value]));
    const raw = JSON.parse(doc.querySelector('blz-data-table')?.getAttribute('allrows') ?? 'null');
    entry.official.records = raw?.map(row => ({ hero: row.id, role: row.hero?.role?.toLowerCase(), name: row.cells.name, winrate: row.cells.winrate, pickrate: row.cells.pickrate, banrate: row.cells.banrate }));
    entry.official.visibleSlots = Object.fromEntries((raw ?? []).map(row => [row.id, Object.fromEntries(['winrate', 'pickrate', 'banrate'].map(field => [field, doc.getElementById(`${row.id}-${field}-value`)?.textContent ?? null]))]));
  }
  output.cases.push(entry);
  console.log(`${region}/${division}: OverFast ${api.status}, official ${page.status}, records ${entry.official.records?.length ?? 0}`);
}
const heroes = await fetch('https://overfast-api.tekrop.fr/heroes?locale=ko-kr', { signal: AbortSignal.timeout(25000) });
output.heroes = { status: heroes.status, fetchedAt: new Date().toISOString(), records: await heroes.json() };
await fs.writeFile(new URL('evidence.json', root), JSON.stringify(output, null, 2) + '\n');
console.log('Research evidence saved. No production files changed.');
