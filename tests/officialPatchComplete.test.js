import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
import {extractOfficialPatches} from '../scripts/lib/officialPatchParser.js';
import {reviewOfficialPatches,collectOfficialPatchNotes} from '../scripts/collect-official-patch-notes.js';
import {pairAutomaticChange,parsePatchFact} from '../scripts/lib/patchChangeRules.js';
import {normalizeOfficialPatches,latestHeroPatch,selectCurrentPatchNote} from '../src/models/officialPatchModel.js';
import {renderHeroPatch} from '../src/views/heroPatchView.js';
import {renderPatchNote} from '../src/views/patchNoteView.js';
const json=async p=>JSON.parse(await fs.readFile(new URL(p,import.meta.url),'utf8'));
const heroes=await json('../src/data/patchHeroNames.json'),actual=await json('../public/data/patches/notes.json'),baseline=await json('./fixtures/official-patch-baseline.json'),manual=await json('../docs/research/official-patches/review-complete.json');
const originalDetection=await json('../docs/research/official-patches/detection.json');
const html=Object.fromEntries(await Promise.all(['ko-kr','en-us'].map(async locale=>[locale,await fs.readFile(new URL(`./fixtures/official-2026-11.${locale}.html`,import.meta.url),'utf8')])));
const parse=(locale,text=html[locale])=>extractOfficialPatches(text,{locale,sourceUrl:`https://overwatch.blizzard.com/${locale}/news/patch-notes/live/2026/11/`,heroes});
const ko=parse('ko-kr'),en=parse('en-us');
function fixtureReview(){const r=structuredClone(manual);for(const p of r.patches){p.sourceHash=ko.patches.find(x=>x.patchId===p.patchId).sourceHash;p.sourceHashEn=en.patches.find(x=>x.patchId===p.patchId).sourceHash;}return r;}
test('November official HTML full coverage: 62 + 3 hero changes, 54-roster mapping, 5 non-hero exclusions, stadium/6v6 isolated',()=>{
 for(const page of [ko,en]){assert.deepEqual(page.patches.map(p=>p.candidates.length),[3,62]);const all=page.patches.flatMap(p=>p.candidates);assert.equal(all.filter(c=>!c.heroKey).length,0);assert.equal(new Set(all.map(c=>c.heroKey)).size,27);assert.equal(all.filter(c=>c.gameMode==='stadium').length,9);assert.equal(all.filter(c=>c.gameMode==='live-6v6').length,1);assert.equal(page.patches.flatMap(p=>p.excluded).length,5);assert(!all.some(c=>c.heroKey==='torbjorn'));}
 const powers=ko.patches.flatMap(p=>p.candidates);assert(powers.some(c=>c.heroKey==='cassidy'&&c.abilityName==='은탄환 - 파워'));assert(powers.some(c=>c.heroKey==='vendetta'&&c.abilityName==='마구잡이 맹공격 - 파워'));
});
test('all previous 52 candidates resolved; original four exact records survive; publication includes all 65 current facts and no raw source text',()=>{
 normalizeOfficialPatches(actual);const published=actual.patches.flatMap(p=>p.changes),november=ko.patches.flatMap(p=>p.candidates);
 for(const c of november){const found=published.find(p=>p.id===c.id);assert(found,`${c.heroKey} ${c.abilityName}`);assert.equal(found.heroKey,c.heroKey);assert.equal(found.gameMode,c.gameMode);assert.equal(found.before,c.before);assert.equal(found.after,c.after);assert.equal(found.unit,c.unit);assert.equal(found.verificationStatus,'verified');assert(/[가-힣]/.test(found.summaryKo));assert(!Object.hasOwn(found,'evidenceText'));}
 for(const previous of baseline.patches.flatMap(p=>p.changes))assert.deepEqual(published.find(c=>c.id===previous.id),previous);
 const previousIds=new Set(baseline.patches.flatMap(p=>p.changes).map(c=>c.id));const source52=originalDetection.detected.patches.flatMap(p=>p.candidates).filter(c=>!previousIds.has(c.id));assert.equal(source52.length,52);let corrected=0;
 for(const c of source52){const found=published.find(p=>p.id===c.id)??published.find(p=>p.evidenceHash===c.evidenceHash&&p.heroKey===c.heroKey&&p.gameMode===c.gameMode);assert(found,`Unresolved original candidate ${c.id}`);if(found.id!==c.id)corrected++;}assert.equal(corrected,2);
 assert.equal(manual.patches.reduce((n,p)=>n+p.changes.length,0),65);
});
test('complete manual review plus generic automatic rules: all 65 applied, pending 0, second run skips, original histories stay',()=>{
 const result=reviewOfficialPatches(ko,en,fixtureReview(),{schemaVersion:1,patches:[]},{automatic:true});assert.equal(result.archive.patches.reduce((n,p)=>n+p.changes.length,0),65);assert.equal(result.pending.length,0);assert.equal(reviewOfficialPatches(ko,en,fixtureReview(),result.archive,{automatic:true}).skipped.length,2);
 const automatic=reviewOfficialPatches(ko,en,null,{schemaVersion:1,patches:[]},{automatic:true});assert(automatic.archive.patches.flatMap(p=>p.changes).length>=30);assert(automatic.pending.length);assert(automatic.archive.patches.flatMap(p=>p.changes).every(c=>c.verificationMethod==='bilingual-numeric-rule'));
});
test('numeric rules handle trailing periods, reversed up/down, inverse cooldown, units and ambiguous matching without forced classification',()=>{
 assert.equal(parsePatchFact('Overhead leap speed reduced from 11 to 9.5.').after,9.5);assert.equal(parsePatchFact('Damage increased to 50% reduced damage (Up from 60% reduced).').before,60);assert.equal(parsePatchFact('재사용 대기시간이 9초에서 7초로 감소했습니다.').changeType,'buff');assert.equal(parsePatchFact('지속 시간이 2초에서 1.5초로 감소했습니다.').changeType,'adjustment');
 const c=ko.patches[1].candidates.find(c=>c.heroKey==='ana');assert(pairAutomaticChange(c,en.patches[1].candidates,{},ko.patches[1].candidates));assert.equal(pairAutomaticChange(c,[...en.patches[1].candidates,...en.patches[1].candidates],{},ko.patches[1].candidates),null);
});
function future(locale){const korean=locale==='ko-kr';return `<div class="PatchNotes-patch PatchNotes-live"><div class="anchor" id="patch-2026-11-07"></div><h3 class="PatchNotes-patchTitle">${korean?'오버워치 패치 노트 - 2026년 11월 8일':'Overwatch November 7'}</h3><div class="PatchNotes-section"><h4 class="PatchNotes-sectionTitle">${korean?'영웅 업데이트':'Hero Updates'}</h4><div class="PatchNotesHeroUpdate"><h5 class="PatchNotesHeroUpdate-name">${korean?'아나':'Ana'}</h5><div class="PatchNotesAbilityUpdate"><div class="PatchNotesAbilityUpdate-name">${korean?'생체 수류탄':'Biotic Grenade'}</div><ul><li>${korean?'피해가 70에서 65로 감소했습니다.':'Damage reduced from 70 to 65.'}</li><li>${korean?'재사용 대기시간이 12초에서 10초로 감소했습니다.':'Cooldown reduced from 12 to 10 seconds.'}</li><li>${korean?'검토가 필요한 새로운 동작입니다.':'A new effect needs contextual review.'}</li></ul></div></div></div></div>`;}
test('saved-HTML new-patch end-to-end: no code/manual review edits -> detect -> normalize -> atomic JSON -> main/hero synchronized; uncertain item withheld',async()=>{
 const root=await fs.mkdtemp(join(tmpdir(),'how-patch-future-')),target=join(root,'notes.json');
 try{const seed=reviewOfficialPatches(ko,en,fixtureReview(),{schemaVersion:1,patches:[]},{automatic:true}).archive;await fs.writeFile(target,JSON.stringify(seed));const fetcher=async url=>{const locale=url.includes('ko-kr')?'ko-kr':'en-us';return {ok:true,text:async()=>future(locale)+html[locale]};};
  const result=await collectOfficialPatchNotes({target,fetcher,apply:true});assert(result.applied);assert(result.added.includes('patch-2026-11-07'));assert.equal(result.pendingChanges,1);
  const next=normalizeOfficialPatches(JSON.parse(await fs.readFile(target,'utf8')));assert.equal(next.patches.find(p=>p.patchId==='patch-2026-11-07').changes.length,2);assert.equal(latestHeroPatch(next,'ana').patch.patchId,'patch-2026-11-07');assert.equal(latestHeroPatch(next,'genji').patch.patchId,'patch-2026-11-03');assert.equal(selectCurrentPatchNote(next).sourceId,'patch-2026-11-07');
  for(const old of seed.patches)assert.deepEqual(next.patches.find(p=>p.patchId===old.patchId),old);
  const bytes=await fs.readFile(target,'utf8');assert.equal((await collectOfficialPatchNotes({target,fetcher,apply:true})).applied,false);assert.equal(await fs.readFile(target,'utf8'),bytes);
  const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;try{const card=renderHeroPatch(next,'ana');assert.match(card.textContent,/70 → 65/);assert.equal(card.querySelectorAll('[data-change-id]').length,2);assert.match(card.textContent,/복합 조정/);assert.match(renderPatchNote(selectCurrentPatchNote(next)).textContent,/2026.11.08/);}finally{globalThis.document=prior;dom.window.close();}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('54 hero cards: full records survive more disclosure, mode-only heroes labelled, prior-update note cannot replace D.Mon balance date',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{let count=0;for(const h of heroes){const card=renderHeroPatch(actual,h.key);if(card){count++;assert(card.querySelector('[data-change-id]'));}}
  assert.equal(count,27);const dmon=latestHeroPatch(actual,'dmon');assert.equal(dmon.patch.patchId,'patch-2026-11-03');assert.equal(dmon.changes.length,5);const card=renderHeroPatch(actual,'dmon');assert.equal(card.querySelectorAll('[data-change-id]').length,5);assert.equal(card.querySelector('.hero-patch-more').open,false);
  assert.match(renderHeroPatch(actual,'cassidy').textContent,/스타디움 전용/);assert.equal(latestHeroPatch(actual,'cassidy'),null);assert.equal(latestHeroPatch(actual,'junker-queen','live-6v6').changes[0].before,450);assert.equal(renderHeroPatch(actual,'kiriko'),null);
 }finally{globalThis.document=prior;dom.window.close();}
});
