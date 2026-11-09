import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JSDOM} from 'jsdom';
import {extractOfficialPatches,classifyPatchChange} from '../scripts/lib/officialPatchParser.js';
import {reviewOfficialPatches,collectOfficialPatchNotes} from '../scripts/collect-official-patch-notes.js';
import {normalizeOfficialPatches,latestHeroPatch,selectCurrentPatchNote,aggregateChangeType,createOfficialPatchModel} from '../src/models/officialPatchModel.js';
import {createOfficialPatchService} from '../src/services/officialPatchService.js';
import {renderHeroPatch} from '../src/views/heroPatchView.js';
import {renderPatchNote,updatePatchNote,setPatchNoteMobile} from '../src/views/patchNoteView.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
// Frozen four-change baseline: future collected patches must not break old regressions.
const actual=JSON.parse(await fs.readFile(new URL('./fixtures/official-patch-baseline.json',import.meta.url),'utf8'));
const heroes=[{key:'ana',name:'아나',nameEn:'Ana'},{key:'genji',name:'겐지',nameEn:'Genji'}];
const body=(locale='ko-kr',value=60)=>`<div class="PatchNotes-patch PatchNotes-live"><div class="anchor" id="patch-2026-11-03"></div><h3 class="PatchNotes-patchTitle">${locale==='ko-kr'?'오버워치 패치 노트 - 2026년 11월 4일':'Overwatch November 3'}</h3><div class="PatchNotes-section"><h4 class="PatchNotes-sectionTitle">${locale==='ko-kr'?'영웅 업데이트':'Hero Updates'}</h4><div class="PatchNotesHeroUpdate"><h5 class="PatchNotesHeroUpdate-name">${locale==='ko-kr'?'아나':'Ana'}</h5><div class="PatchNotesAbilityUpdate"><div class="PatchNotesAbilityUpdate-name">${locale==='ko-kr'?'생체 수류탄':'Biotic Grenade'}</div><ul><li>${locale==='ko-kr'?`폭발 피해가 90에서 ${value}으로 감소했습니다.`:`Explosion damage reduced from 90 to ${value}.`}</li></ul></div></div></div><div class="PatchNotes-section"><h4 class="PatchNotes-sectionTitle">${locale==='ko-kr'?'스타디움 업데이트':'Stadium Updates'}</h4></div><div class="PatchNotes-section"><h4 class="PatchNotes-sectionTitle">공격</h4><div class="PatchNotesHeroUpdate"><h5 class="PatchNotesHeroUpdate-name">${locale==='ko-kr'?'겐지':'Genji'}</h5><div class="PatchNotesAbilityUpdate"><div class="PatchNotesAbilityUpdate-name">파워</div><ul><li>피해가 10에서 15로 증가했습니다.</li><li>기술 동작을 조정했습니다. (6v6)</li></ul></div></div></div></div>`;
const parsed=(locale,value=60)=>extractOfficialPatches(body(locale,value),{locale,sourceUrl:`https://overwatch.blizzard.com/${locale}/news/patch-notes/live/2026/11/`,heroes});
function review(ko,en){const p=ko.patches[0],english=en.patches[0];return {patches:[{patchId:p.patchId,sourceHash:p.sourceHash,sourceHashEn:english.sourceHash,reviewedAt:'2026-11-09',summaryKo:'아나의 공격 성능 조정',changes:[{id:p.candidates[0].id,englishId:english.candidates[0].id,before:90,after:60,gameMode:'live-5v5',changeType:'nerf',summaryKo:'수류탄의 폭발 피해가 줄었습니다.'}]}]};}
test('official parser: actual-shaped unique anchors, Korean title date vs ID, live/stadium/6v6 and pending classifications',()=>{
 const p=parsed('ko-kr').patches[0];assert.equal(p.publishedDate,'2026-11-03');assert.equal(p.localizedTitleDate,'2026-11-04');assert.equal(p.candidates[0].heroKey,'ana');assert.equal(p.candidates[0].before,90);assert.equal(p.candidates[0].after,60);assert.equal(p.candidates[0].verificationStatus,'review-required');assert.equal(p.candidates[1].gameMode,'stadium');assert.equal(p.candidates[2].gameMode,'live-6v6');assert(!p.candidates[0].summaryKo.includes('폭발 피해가 90에서'));
 assert.throws(()=>extractOfficialPatches('<html>layout changed</html>',{locale:'ko-kr',sourceUrl:'https://overwatch.blizzard.com',heroes}));assert.throws(()=>extractOfficialPatches(body()+body(),{locale:'ko-kr',sourceUrl:'https://overwatch.blizzard.com',heroes}));
});
test('classification: damage decrease, healing/cooldown, ambiguous duration, mixed effects and bugfix',()=>{
 assert.equal(classifyPatchChange('피해가 90에서 60으로 감소했습니다.').changeType,'nerf');assert.equal(classifyPatchChange('치유 기술 재사용 대기시간이 9초에서 7초로 감소했습니다.').changeType,'buff');assert.equal(classifyPatchChange('지속 시간이 2초에서 1.5초로 감소했습니다.').changeType,'adjustment');assert.equal(classifyPatchChange('버그를 수정했습니다.').changeType,'bugfix');assert.equal(aggregateChangeType([{changeType:'buff'},{changeType:'nerf'}]),'mixed');
 assert.equal(classifyPatchChange('받는 피해가 50에서 40으로 감소했습니다.').changeType,'adjustment');assert.equal(classifyPatchChange('피해가 50에서 50으로 변경됐습니다.').changeType,'adjustment');
});
test('review gate: unreviewed/new/revised notes do not publish; exact bilingual evidence permits only reviewed changes, duplicate skipped, old history preserved',()=>{
 const ko=parsed('ko-kr'),en=parsed('en-us');assert.equal(reviewOfficialPatches(ko,en).archive.patches.length,0);
 const one=reviewOfficialPatches(ko,en,review(ko,en));assert.equal(one.archive.patches.length,1);assert.equal(one.archive.patches[0].changes.length,1);
 assert.deepEqual(reviewOfficialPatches(ko,en,null,one.archive).skipped,['patch-2026-11-03']);
 const revised=reviewOfficialPatches(parsed('ko-kr',50),en,null,one.archive);assert.deepEqual(revised.archive,one.archive);assert.equal(revised.pending.length,1);
 const bad=review(ko,en);bad.patches[0].changes[0].after=99;assert.throws(()=>reviewOfficialPatches(ko,en,bad));
 const enChanged=parsed('en-us',50);assert.equal(reviewOfficialPatches(ko,enChanged,null,one.archive).pending.length,1);
});
test('verified actual notes: November 5 coexists with November 3; Ana 90→60, Genji 2→1.5 and Wrecking Ball own latest patch',()=>{
 normalizeOfficialPatches(actual);assert.equal(actual.patches.length,2);assert.equal(selectCurrentPatchNote(actual).sourceId,'patch-2026-11-05');
 const ana=latestHeroPatch(actual,'ana'),genji=latestHeroPatch(actual,'genji');assert.equal(ana.patch.publishedDate,'2026-11-03');assert.deepEqual([ana.changes[0].before,ana.changes[0].after],[90,60]);assert.deepEqual([genji.changes[0].before,genji.changes[0].after],[2,1.5]);assert.equal(genji.changeType,'nerf');assert.equal(latestHeroPatch(actual,'wrecking-ball').patch.publishedDate,'2026-11-05');assert.equal(latestHeroPatch(actual,'kiriko'),null);
 const bad=structuredClone(actual);bad.patches[0].changes[0].sourceUrl='https://example.com';assert.throws(()=>normalizeOfficialPatches(bad));
 const garbled=structuredClone(actual);garbled.patches[0].summaryKo='?????';assert.throws(()=>normalizeOfficialPatches(garbled),/한국어/);assert.match(ana.changes[0].summaryKo,/폭발 피해/);assert.match(genji.changes[0].summaryKo,/방어 가능한 시간/);
 const model=createOfficialPatchModel();model.set(actual);model.fail(new Error('network'));assert.equal(model.current().sourceId,'patch-2026-11-05');
});
test('official service: shared same-origin JSON, invalid response and HTTP/network errors do not mutate model',async()=>{
 let calls=0;const s=createOfficialPatchService({base:'/HOW/',fetcher:async url=>{assert.equal(url,'/HOW/data/patches/notes.json');calls++;return {ok:true,json:async()=>actual};}});await Promise.all([s.getNotes(),s.getNotes()]);assert.equal(calls,1);
 for(const fetcher of [async()=>({ok:false,status:503}),async()=>({ok:true,json:async()=>({})}),async()=>{throw Error('network')}])await assert.rejects(createOfficialPatchService({fetcher}).getNotes());
});
async function temporary(run){const root=await fs.mkdtemp(join(tmpdir(),'how-official-notes-'));try{await run(join(root,'notes.json'));}finally{await fs.rm(root,{recursive:true,force:true});}}
test('collector: manual dry-run no publication, apply atomic file, same IDs skipped, no overwritten file on network/parser/rename failure',()=>temporary(async target=>{
 const ko=parsed('ko-kr'),en=parsed('en-us'),fetcher=async url=>({ok:true,text:async()=>body(url.includes('ko-kr')?'ko-kr':'en-us')});
 const r=await collectOfficialPatchNotes({target,fetcher,review:review(ko,en)});assert.equal(r.applied,false);await assert.rejects(fs.readFile(target));
 const saved=await collectOfficialPatchNotes({target,fetcher,review:review(ko,en),apply:true});assert.equal(saved.applied,true);const bytes=await fs.readFile(target,'utf8');
 const again=await collectOfficialPatchNotes({target,fetcher,apply:true});assert.equal(again.applied,false);assert.equal(await fs.readFile(target,'utf8'),bytes);
 for(const f of [async()=>({ok:false,status:503}),async()=>({ok:true,text:async()=>'<html>changed</html>'})]){await assert.rejects(collectOfficialPatchNotes({target,fetcher:f,apply:true}));assert.equal(await fs.readFile(target,'utf8'),bytes);}
 const actualBytes=JSON.stringify(actual);await fs.writeFile(target,actualBytes);await assert.rejects(collectOfficialPatchNotes({target,fetcher,review:review(ko,en),apply:true,io:{...fs,rename:async()=>{throw Error('replace failed')}}}));assert.equal(await fs.readFile(target,'utf8'),actualBytes);assert.deepEqual(await fs.readdir(join(target,'..')),['notes.json']);
}));
test('DOM: patch before counters/synergies/passive, no empty panel; main hotfix updates from same archive without resetting disclosure/focus',async()=>{
 const dom=new JSDOM('<main id="hero-detail-page"></main><aside id="sidebar"></aside>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{
  const detail=normalizeHeroDetail({name:'아나',role:'support'},'ana'),model=createHeroModel(),view=createHeroDetailView();view.render({status:'ready',result:{detail,fetchedAt:'2026-11-09T00:00:00Z'}},model,{key:'ana',tab:'overview'},undefined,undefined,undefined,undefined,undefined,actual);
  const side=document.querySelector('.detail-summary-side');assert(side.children[0].classList.contains('hero-patch-panel'));assert(side.children[1].classList.contains('counter-panel'));assert(side.children[2].classList.contains('synergy-panel'));assert.equal(side.children[3].id,'detail-passives');assert.match(side.children[0].textContent,/90 → 60/);assert.match(side.children[0].textContent,/2026.11.03/);assert.equal(renderHeroPatch(actual,'kiriko'),null);
  const oldArchive={schemaVersion:1,patches:actual.patches.filter(p=>p.patchId==='patch-2026-11-03')},card=renderPatchNote(selectCurrentPatchNote(oldArchive));document.body.append(card);setPatchNoteMobile(card,true);card.querySelector('details').open=true;card.querySelector('summary').focus();updatePatchNote(card,selectCurrentPatchNote(actual));assert.equal(card.querySelector('details').open,true);assert.equal(document.activeElement,card.querySelector('summary'));assert.match(card.querySelector('a').href,/#patch-2026-11-05$/);assert.equal(document.querySelectorAll('#current-patch-note').length,1);
 }finally{globalThis.document=old;dom.window.close();}
});
