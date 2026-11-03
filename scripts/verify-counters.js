import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COUNTER_RELATIONS } from '../src/data/counters.js';
import { COUNTER_HERO_KEYS } from '../src/data/counters/roster.js';
import { normalizeCounters } from '../src/models/counterModel.js';
const roster = JSON.parse(await readFile(new URL('../docs/research/phase3/hero-roster.json', import.meta.url), 'utf8')).heroes;
assert.deepEqual([...COUNTER_HERO_KEYS].sort(), roster.map(h => h.key).sort(), 'Counter roster differs from captured HOW roster');
const rows = normalizeCounters(COUNTER_RELATIONS);
assert.equal(new Set(rows.map(r => `${r.heroKey}:${r.counterHeroKey}`)).size, rows.length);
for (const row of rows) {
  assert.equal(row.mode, '5v5'); assert.equal(row.relationType, 'counteredBy');
  assert(row.sourceUrls.includes(row.sourceUrl));
  assert(!('winRate' in row) && !('confidence' in row), 'Do not turn manual judgments into measured statistics');
  if (row.evidenceStatus === 'conflicting') assert(row.conflicts.length >= 2);
}
const counts = { reviewedHeroes: roster.length, populatedHeroes: new Set(rows.map(r => r.heroKey)).size, relations: rows.length, conflicts: rows.filter(r => r.evidenceStatus === 'conflicting').length };
console.log(`Counter database verified: ${JSON.stringify(counts)}`);
