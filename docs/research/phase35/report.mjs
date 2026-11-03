import fs from 'node:fs/promises';
import { COUNTER_RELATIONS } from '../../../src/data/counters.js';
import { normalizeCounters } from '../../../src/models/counterModel.js';
const rows = normalizeCounters(COUNTER_RELATIONS);
const roster = JSON.parse(await fs.readFile(new URL('../phase3/hero-roster.json', import.meta.url), 'utf8')).heroes;
const names = new Map(roster.map(h => [h.key, h.name]));
let table = '\n\n## 전체 영웅별 후보\n\n|영웅|역할|후보(현재 영웅을 카운터)|구축 상태|\n|---|---|---|---|\n';
for (const h of roster) { const group = rows.filter(r => r.heroKey === h.key); table += `|${h.name} (${h.key})|${h.role}|${group.map(r => `${names.get(r.counterHeroKey)} [${r.evidenceStatus}]`).join(', ') || '미제공'}|${group.length ? '입력' : '비교 근거 부족'}|\n`; }
table += '\n## 관계별 근거 목록\n\n화살표는 카운터당하는 영웅 ← 카운터 영웅이다. 모든 applicablePatch는 null, mode는 5v5, 검토일은 2026-11-03이다.\n\n|관계|유형/상태|HOW 설명|출처|\n|---|---|---|---|\n';
for (const row of rows) table += `|${names.get(row.heroKey)} ← ${names.get(row.counterHeroKey)}|${row.counterType} / ${row.evidenceStatus}|${row.reason}|${row.sourceUrls.map((url,i)=>`[${i+1}](${url})`).join(' ')}|\n`;
const target = new URL('../../COUNTER-DATA-RESEARCH.md', import.meta.url);
const marker = '<!-- GENERATED COUNTER TABLE -->';
const intro = (await fs.readFile(target, 'utf8')).split(marker)[0];
await fs.writeFile(target, intro + marker + table);
const manifest = roster.map(h=>({ ...h, kitReview: 'completed', candidateCount: rows.filter(r=>r.heroKey===h.key).length, relationshipReview: rows.some(r=>r.heroKey===h.key) ? 'populated-with-evidence-labels' : 'insufficient-comparative-evidence' }));
await fs.writeFile(new URL('coverage.json',import.meta.url),JSON.stringify({reviewedAt:'2026-11-03',targets:roster.length,populated:new Set(rows.map(r=>r.heroKey)).size,relations:rows.length,heroes:manifest},null,2));
await fs.writeFile(new URL('../../COUNTER-COVERAGE.md',import.meta.url),'# 카운터 데이터 구축 현황\n\n2026-11-03 · 54명 키트 검토 / 50명 입력 / 관계 82개. 확정 상성 54명 완료가 아님.\n\n'+table.split('## 관계별 근거 목록')[0]);
console.log(`Research report generated: ${roster.length} hero rows, ${rows.length} relationships.`);
