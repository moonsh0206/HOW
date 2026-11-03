// Explicit local evidence refresh; not part of build or scheduled collection.
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { COUNTER_HERO_KEYS } from '../src/data/counters/roster.js';
const reviewedAt = '2026-11-03';
const heroes = [];
for (let i = 0; i < COUNTER_HERO_KEYS.length; i += 6) {
  heroes.push(...await Promise.all(COUNTER_HERO_KEYS.slice(i, i + 6).map(async key => {
    const sourceUrl = `https://overwatch.blizzard.com/ko-kr/heroes/${key}/`;
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${key}: ${response.status}`);
    const dom = new JSDOM(await response.text()), document = dom.window.document;
    const role = document.querySelector('blz-list-item.role'), subrole = document.querySelector('blz-list-item.subrole');
    const result = { heroKey: key, parentRoleNameKo: role?.querySelector('p')?.textContent.trim() ?? null, subroleNameKo: subrole?.querySelector('p')?.textContent.trim() ?? null, descriptionKo: subrole?.getAttribute('descriptiontext') ?? null, icon: subrole?.querySelector('blz-icon')?.getAttribute('src') ?? null, sourceUrl, reviewedAt };
    dom.window.close(); return result;
  })));
}
const patches = [];
for (const path of ['live/2026/02/', 'live/2026/8/', '']) {
  const sourceUrl = `https://overwatch.blizzard.com/ko-kr/news/patch-notes/${path}`;
  const response = await fetch(sourceUrl); if (!response.ok) throw new Error(`patch: ${response.status}`);
  const dom = new JSDOM(await response.text()), doc = dom.window.document;
  // Retain only sub-role sections for review, not the site's entire content.
  const texts = [...doc.querySelectorAll('h1,h2,h3,h4,h5,p,li')].map(el => el.textContent.trim());
  const excerpts = [];
  for (let i = 0; i < texts.length; i++) if (/ハ|하위 역할|측면 공격가|강건한 자|전술가|생존왕/.test(texts[i]) && texts[i].length < 2000) excerpts.push(texts.slice(Math.max(0,i-1),i+5).join('\n'));
  patches.push({ sourceUrl, headings: [...doc.querySelectorAll('h2')].map(el=>el.textContent.trim()), excerpts: [...new Set(excerpts)] });
  dom.window.close();
}
const api = await fetch('https://overfast-api.tekrop.fr/heroes/genji?locale=ko-kr').then(r=>r.json());
const schema = await fetch('https://overfast-api.tekrop.fr/openapi.json').then(r=>r.json());
const requiredCases = [];
for (const key of ['shion','sombra','dmon','doctrine']) {
  const response = await fetch(`https://overfast-api.tekrop.fr/heroes/${key}?locale=ko-kr`).then(r=>r.json());
  requiredCases.push({ key, role: response.role, subrole: response.subrole });
}
const output = { reviewedAt, heroes, patches, api: { sourceUrl:'https://overfast-api.tekrop.fr/heroes/genji?locale=ko-kr', fields:Object.keys(api), subrole:api.subrole ?? null, abilityFields:Object.keys(api.abilities?.[0] ?? {}), schema: schema.components?.schemas?.SubRole, requiredCases } };
await fs.mkdir('docs/research/subroles',{recursive:true});
await fs.writeFile('docs/research/subroles/official-review.json',JSON.stringify(output,null,2)+'\n');
console.log(`Reviewed ${heroes.length} official hero pages and ${patches.length} patch pages.`);
