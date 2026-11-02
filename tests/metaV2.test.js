import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attachMetaTiers, sEligibility, S_REQUIREMENTS } from '../src/domain/meta.js';
import { roleTier } from '../src/domain/tier.js';
import { tierButton, showTierReason } from '../src/views/tierReasonView.js';
import { JSDOM } from 'jsdom';
const heroes = Array.from({ length: 10 }, (_, i) => ({ key: `hero-${i}`, name: `Hero ${i}`, role: 'tank' }));
const records = heroes.map((h, i) => ({ hero: h.key, winRate: 60 - i, pickRate: 10 - i, banRate: 10 - i }));
test('v2: exact three-component score, role ranks, gates and stable ties', () => {
  const scored = attachMetaTiers(heroes, records);
  assert.equal(scored[0].metaScore, 100); assert.equal(scored[0].tier, 'S');
  assert.equal(scored[9].metaScore, 0);
  assert(Math.abs(scored[2].metaScore - (100 * 7 / 9)) < 1e-8);
  assert.deepEqual(scored.map(h => h.tier), ['S', 'S', 'A', 'B', 'B', 'C', 'C', 'C', 'D', 'D']);
  const tied = attachMetaTiers(heroes, records.map(r => ({ ...r, winRate: 55, pickRate: 5, banRate: 0 })));
  assert(tied.every(h => h.metaScore === 50 && h.roleRank === 1 && h.provisionalTier === 'S' && h.tier === 'A'));
  assert.deepEqual(attachMetaTiers([...heroes].reverse(), records).reverse(), scored);
  assert.throws(() => attachMetaTiers(heroes, records, { weights: { winRate: .7, pickRate: .3 } }));
});
test('v2: S requirements are inclusive, independent and never refill a vacancy', () => {
  const hero = { statistics: { winRate: 50, pickRate: 1 }, winPercentile: 60, pickPercentile: 40 };
  assert(sEligibility(hero, 5).every(r => r.passed));
  for (const field of Object.keys(S_REQUIREMENTS)) {
    const h = structuredClone(hero); let size = 5;
    if (field === 'cohortSize') size = 4;
    else if (field in h.statistics) h.statistics[field] -= .01;
    else h[field] -= .01;
    assert.equal(sEligibility(h, size).filter(r => !r.passed).length, 1);
  }
  const small = attachMetaTiers(heroes.slice(0, 4), records.slice(0, 4));
  assert.equal(small[0].provisionalTier, 'S'); assert.equal(small[0].tier, 'A'); assert(!small.some(h => h.tier === 'S'));
  assert.deepEqual([1, 2, 3, 5, 8, 9].map(rank => roleTier(rank, 10)), ['S', 'S', 'A', 'B', 'C', 'D']);
});
test('v2: high popularity cannot authorize low-win S; high win low pick cannot authorize S', () => {
  for (const modified of [records.map(r => ({ ...r, winRate: r.winRate - 15 })), records.map(r => ({ ...r, pickRate: r.pickRate / 100 }))]) {
    const output = attachMetaTiers(heroes, modified);
    assert(output.some(h => h.capped)); assert(!output.some(h => h.tier === 'S'));
    assert(output.filter(h => h.capped).every(h => h.tier === 'A' && h.provisionalTier === 'S'));
  }
});
test('v2: missing/null/invalid ban is unclassified; zero is real; no unknown key assignment', () => {
  for (const banRate of [null, undefined, NaN, -1, 101, '0']) {
    const output = attachMetaTiers(heroes, [{ ...records[0], banRate }]);
    assert.equal(output[0].metaScore, null); assert.equal(output[0].tier, null);
  }
  assert.equal(attachMetaTiers(heroes, [{ ...records[0], banRate: 0 }])[0].metaScore, 50);
  assert(attachMetaTiers(heroes, [{ ...records[0], hero: 'unknown' }]).every(h => h.tier === null));
});
test('captured eight cohorts: score components and S restrictions hold independently', () => {
  const evidence = JSON.parse(fs.readFileSync(new URL('../docs/research/tier-design/evidence.json', import.meta.url)));
  const scores = evidence.cases.map(c => attachMetaTiers(evidence.heroes.records, c.api.records.map(r => ({ hero: r.hero, winRate: r.winrate, pickRate: r.pickrate, banRate: r.banrate }))));
  assert.equal(scores.length, 8);
  for (const cohort of scores) for (const h of cohort) {
    assert(Math.abs(h.metaScore - (.65 * h.winPercentile + .25 * h.pickPercentile + .1 * h.banPercentile)) < 1e-8);
    if (h.tier === 'S') assert(h.eligibility.every(r => r.passed));
  }
  assert(new Set(scores.map(cohort => cohort.find(h => h.key === 'genji').metaScore)).size > 1);
});
test('DOM: tier is an accessible button and explanation uses safe text and exact contributions', () => {
  const dom = new JSDOM('<body></body>'); const previous = globalThis.document; globalThis.document = dom.window.document;
  try {
    dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    dom.window.HTMLDialogElement.prototype.close = function () { this.dispatchEvent(new dom.window.Event('close')); };
    const hero = attachMetaTiers(heroes, records)[0]; hero.name = '<img onerror=bad>';
    const button = tierButton(hero); document.body.append(button); button.focus();
    assert.equal(button.dataset.tier, hero.key); assert(button.getAttribute('aria-label').includes('산정 근거'));
    showTierReason(hero, { statsFilters: { platform: 'pc', region: 'asia', gamemode: 'competitive', division: 'diamond', map: 'all' } });
    const dialog = document.querySelector('dialog'); assert(dialog.open); assert.equal(dialog.querySelector('img'), null);
    assert(dialog.textContent.includes('× 0.65 = 65.00')); assert(dialog.textContent.includes('최종 S'));
    dialog.querySelector('button').click(); assert.equal(document.querySelector('dialog'), null); assert.equal(document.activeElement, button);
  } finally { globalThis.document = previous; dom.window.close(); }
});
