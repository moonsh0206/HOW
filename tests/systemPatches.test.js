import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {extractOfficialPatches} from '../scripts/lib/officialPatchParser.js';
import {reviewOfficialPatches,collectOfficialPatchNotes} from '../scripts/collect-official-patch-notes.js';
import {prepareOfficialPatchUpdate} from '../scripts/prepare-official-patch-update.js';
import {validatePatchUpdate} from '../scripts/lib/patchPublication.js';
import {normalizeOfficialPatches,latestHeroPatch,selectCurrentPatchNote} from '../src/models/officialPatchModel.js';
import {createOfficialPatchService} from '../src/services/officialPatchService.js';
import {renderPatchNote,updatePatchNote,setPatchNoteMobile} from '../src/views/patchNoteView.js';
import {setLanguage} from '../src/i18n/i18n.js';
const read=async path=>JSON.parse(await fs.readFile(new URL(path,import.meta.url),'utf8'));
const heroes=await read('../src/data/patchHeroNames.json'),original=await read('./fixtures/official-patch-november-complete.json');
const html=Object.fromEntries(await Promise.all(['ko-kr','en-us'].map(async locale=>[locale,await fs.readFile(new URL(`./fixtures/official-2026-11-16.${locale}.html`,import.meta.url),'utf8')])));
const parse=(locale,text=html[locale])=>extractOfficialPatches(text,{locale,sourceUrl:`https://overwatch.blizzard.com/${locale}/news/patch-notes/live/2026/11/`,heroes});
const ko=parse('ko-kr'),en=parse('en-us'),review=(a=ko,b=en,archive=original,manual=null)=>reviewOfficialPatches(a,b,manual,archive,{automatic:true});
const fetcher=async url=>({ok:true,text:async()=>html[url.includes('ko-kr')?'ko-kr':'en-us']});
test('captured official Nov16: verified 6v6 Champion rank-width 4→3, no hero changes, KO title date remains distinct',()=>{
 const p=ko.patches[0];assert.equal(p.publishedDate,'2026-11-16');assert.equal(p.localizedTitleDate,'2026-11-17');assert.equal(p.type,'hotfix');assert.equal(p.candidates.length,0);assert.equal(p.systemCandidates.length,1);
 const result=review(),patch=result.archive.patches.at(-1);assert.deepEqual(result.added,['patch-2026-11-16']);assert.equal(patch.changes.length,0);assert.equal(patch.systemChanges.length,1);
 assert.deepEqual([patch.systemChanges[0].before,patch.systemChanges[0].after,patch.systemChanges[0].unit],[4,3,'rank-width']);assert.equal(patch.systemChanges[0].category,'competitive');assert.equal(patch.systemCoverage.pending,0);assert.equal(patch.reviewStatus,'complete');assert.equal(patch.effectiveAt,null);assert.equal(patch.statisticsWindowStatus,'unverified');
 assert.equal(selectCurrentPatchNote(result.archive).dateKo,'2026-11-16');assert.equal(selectCurrentPatchNote(result.archive).localizedTitleDate,'2026-11-17');validatePatchUpdate(original,result.archive);assert.deepEqual(result.archive.patches.slice(0,original.patches.length),original.patches);
 for(const key of ['ana','wrecking-ball','dmon'])assert.deepEqual(latestHeroPatch(result.archive,key),latestHeroPatch(original,key));
});
test('system parser/translation/numeric mismatch never silently becomes a verified empty patch',()=>{
 const mismatched=parse('en-us',html['en-us'].replace('from 4 to 3','from 4 to 2'));
 const result=review(ko,mismatched);assert.equal(result.added.length,0);assert.equal(result.pending[0].systemCandidates.length,1);
 const wrongDate=parse('en-us',html['en-us'].replaceAll('patch-2026-11-16','patch-2026-11-17'));assert.equal(review(ko,wrongDate).added.length,0);
 const changed=parse('ko-kr',html['ko-kr'].replaceAll('PatchNotes-sectionDescription','Unrecognized-body'));assert.equal(review(changed,en).added.length,0);assert.match(review(changed,en).pending[0].reason,/구조/);
 const unknown=parse('ko-kr',html['ko-kr'].replace('챔피언 등급','그랜드마스터 등급'));assert.equal(review(unknown,en).added.length,0);
 const ambiguous={...en,patches:en.patches.map(p=>({...p,systemCandidates:[...p.systemCandidates,...p.systemCandidates]}))};assert.equal(review(ko,ambiguous).added.length,0);
});
test('generic bugfix/system/other prose needs exact bilingual manual evidence; malformed review cannot publish',()=>{
 for(const [headingKo,headingEn]of [['버그 수정','Bug Fixes'],['일반 업데이트','General Updates'],['기타 업데이트','Other Updates']]){
  const a=parse('ko-kr',html['ko-kr'].replace('경쟁전 업데이트',headingKo).replace(/<li>[\s\S]*?<\/li>/,'<li>메뉴가 닫히지 않는 문제를 수정했습니다.</li>'));
  const b=parse('en-us',html['en-us'].replace('Competitive Play Updates',headingEn).replace(/<li>[\s\S]*?<\/li>/,'<li>Fixed an issue that prevented closing the menu.</li>'));
  assert.equal(review(a,b).added.length,0);const c=a.patches[0].systemCandidates[0],peer=b.patches[0].systemCandidates[0];
  const manual={patches:[{patchId:c.patchId,sourceHash:a.patches[0].sourceHash,sourceHashEn:b.patches[0].sourceHash,reviewedAt:'2026-11-22',systemChanges:[{id:c.id,englishEvidenceId:peer.id,evidenceHash:c.evidenceHash,englishEvidenceHash:peer.evidenceHash,category:c.category,summaryKo:'메뉴가 닫히지 않는 문제를 수정했습니다.'}]}]};
  const result=review(a,b,original,manual),p=result.archive.patches.at(-1);assert.equal(p.systemChanges[0].verificationMethod,'bilingual-manual-review');assert.equal(p.changes.length,0);
  const bad=structuredClone(manual);bad.patches[0].systemChanges[0].englishEvidenceHash='0'.repeat(64);assert.throws(()=>review(a,b,original,bad),/근거/);
 }
});
test('same system patch is idempotent; changed official source creates a revision and keeps every old verified fact',()=>{
 const first=review();assert.deepEqual(review(ko,en,first.archive).skipped,['patch-2026-11-16']);
 const a=parse('ko-kr',html['ko-kr'].replace('4인에서 3인','4인에서 2인')),b=parse('en-us',html['en-us'].replace('from 4 to 3','from 4 to 2'));
 const next=review(a,b,first.archive);assert.equal(next.archive.patches.filter(p=>p.patchId==='patch-2026-11-16').length,2);assert.equal(selectCurrentPatchNote(next.archive).systemChanges[0].after,2);validatePatchUpdate(first.archive,next.archive);
 const bad=structuredClone(first.archive);bad.patches.at(-1).systemChanges[0].after=2;assert.throws(()=>validatePatchUpdate(first.archive,bad),/削除|삭제/);
 const malformed=structuredClone(first.archive);malformed.patches.at(-1).systemChanges[0].englishEvidenceHash='unknown';assert.throws(()=>normalizeOfficialPatches(malformed),/검증/);
});
test('isolated prepare→validate→save preserves original archive; repeated collection keeps bytes/mtime; network failure preserves data',async()=>{
 const dir=await fs.mkdtemp(join(tmpdir(),'how-system-patch-'));try{
  const target=join(dir,'notes.json'),report=join(dir,'report.json');await fs.writeFile(target,JSON.stringify(original));
  const result=await prepareOfficialPatchUpdate({target,report,fetcher});assert(result.changed);assert.equal(result.validation.systemChanges,1);
  const bytes=await fs.readFile(target),mtime=(await fs.stat(target)).mtimeMs;const repeat=await prepareOfficialPatchUpdate({target,report,fetcher});assert.equal(repeat.changed,false);assert((await fs.readFile(target)).equals(bytes));assert.equal((await fs.stat(target)).mtimeMs,mtime);
  await assert.rejects(collectOfficialPatchNotes({target,apply:true,fetcher:async()=>({ok:false,status:503})}));assert((await fs.readFile(target)).equals(bytes));
  const calls=[];const service=createOfficialPatchService({base:'/HOW/',fetcher:async url=>{calls.push(url);return {ok:true,json:async()=>JSON.parse(bytes)};}});assert.equal(selectCurrentPatchNote(await service.getNotes()).sourceId,'patch-2026-11-16');assert.deepEqual(calls,['/HOW/data/patches/notes.json']);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('KO/EN/JA latest system card is concise, canonical-date based and always visible on mobile, with no empty disclosure',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en','ja']){setLanguage(lang);const card=renderPatchNote(selectCurrentPatchNote(original));document.body.replaceChildren(card);setPatchNoteMobile(card,true);card.querySelector('summary').focus();updatePatchNote(card,selectCurrentPatchNote(review().archive));
  assert.match(card.querySelector('.patch-note-date').textContent,/2026.11.16/);assert.equal(card.querySelector('details'),null);assert(card.querySelector('.patch-note-summary'));assert(card.querySelector('.patch-note-link').href.endsWith('#patch-2026-11-16'));assert.equal(document.activeElement,card.querySelector('.patch-note-link'));
  if(lang!=='ko')assert(!/[가-힣]/.test(card.querySelector('.patch-note-summary').textContent));assert.match(card.textContent,/4.*3/);
 }}finally{globalThis.document=old;setLanguage('ko');dom.window.close();}
});
