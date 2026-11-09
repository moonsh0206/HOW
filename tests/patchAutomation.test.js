import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseDocument} from 'yaml';
import {build} from 'vite';
import {JSDOM} from 'jsdom';
import {prepareOfficialPatchUpdate} from '../scripts/prepare-official-patch-update.js';
import {installPatchCandidate} from '../scripts/install-official-patch-candidate.js';
import {validatePatchUpdate,patchDigest,publicationRevisionMode} from '../scripts/lib/patchPublication.js';
import {extractOfficialPatches} from '../scripts/lib/officialPatchParser.js';
import {reviewOfficialPatches} from '../scripts/collect-official-patch-notes.js';
import {latestHeroPatch,selectCurrentPatchNote} from '../src/models/officialPatchModel.js';
import {renderHeroPatch} from '../src/views/heroPatchView.js';
import {renderPatchNote} from '../src/views/patchNoteView.js';

const read=async file=>JSON.parse(await fs.readFile(new URL(file,import.meta.url),'utf8'));
const heroes=await read('../src/data/patchHeroNames.json'),review=await read('../docs/research/official-patches/review-complete.json');
const html=Object.fromEntries(await Promise.all(['ko-kr','en-us'].map(async locale=>[locale,await fs.readFile(new URL(`./fixtures/official-2026-11.${locale}.html`,import.meta.url),'utf8')])));
const parse=locale=>extractOfficialPatches(html[locale],{locale,sourceUrl:`https://overwatch.blizzard.com/${locale}/news/patch-notes/live/2026/11/`,heroes});
const ko=parse('ko-kr'),en=parse('en-us'),adjusted=structuredClone(review);
for(const p of adjusted.patches){p.sourceHash=ko.patches.find(x=>x.patchId===p.patchId).sourceHash;p.sourceHashEn=en.patches.find(x=>x.patchId===p.patchId).sourceHash;}
const seed=reviewOfficialPatches(ko,en,adjusted,{schemaVersion:1,patches:[]},{automatic:true}).archive;
const fetchPage=extra=>async url=>({ok:true,text:async()=>{const locale=url.includes('ko-kr')?'ko-kr':'en-us';return(extra?.(locale)??'')+html[locale];}});
function future(locale,{uncertainOnly=false,after=65}={}){
 const korean=locale==='ko-kr';return `<div class="PatchNotes-patch PatchNotes-live"><div class="anchor" id="patch-2026-11-07"></div><h3 class="PatchNotes-patchTitle">${korean?'오버워치 패치 노트 - 2026년 11월 8일':'Overwatch November 7'}</h3><div class="PatchNotes-section"><h4 class="PatchNotes-sectionTitle">${korean?'영웅 업데이트':'Hero Updates'}</h4><div class="PatchNotesHeroUpdate"><h5 class="PatchNotesHeroUpdate-name">${korean?'아나':'Ana'}</h5><div class="PatchNotesAbilityUpdate"><div class="PatchNotesAbilityUpdate-name">${korean?'생체 수류탄':'Biotic Grenade'}</div><ul>${uncertainOnly?'':`<li>${korean?`피해가 70에서 ${after}로 감소했습니다.`:`Damage reduced from 70 to ${after}.`}</li>`}<li>${korean?'새 동작은 문맥 검토가 필요합니다.':'New behavior requires review.'}</li></ul></div></div></div></div>`;
}
async function isolated(run){const root=await fs.mkdtemp(join(tmpdir(),'how-patch-automation-'));try{const target=join(root,'notes.json'),report=join(root,'reports/update.json'),output=join(root,'outputs');await fs.writeFile(target,JSON.stringify(seed,null,2)+'\n');await run({root,target,report,output});}finally{await fs.rm(root,{recursive:true,force:true});}}

test('A/E no new patch and repeated candidate: identical bytes/mtime, no publication output, exact history retained',async()=>isolated(async paths=>{
 const bytes=await fs.readFile(paths.target),mtime=(await fs.stat(paths.target)).mtimeMs;
 const result=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage()});assert.equal(result.changed,false);assert.equal((await fs.readFile(paths.target)).equals(bytes),true);assert.equal((await fs.stat(paths.target)).mtimeMs,mtime);assert.match(await fs.readFile(paths.output,'utf8'),/changed=false/);
 const first=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(future)});assert(first.changed);assert.equal(first.collection.pendingChanges,1);assert.equal(first.validation.partial[0].pending,1);
 const candidate=await fs.readFile(paths.target);const second=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(future)});assert.equal(second.changed,false);assert((await fs.readFile(paths.target)).equals(candidate));
}));

test('B/C verified partial candidate updates shared main/hero source, uncertain-only patch is withheld; all 65 facts survive',async()=>isolated(async paths=>{
 const pending=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(locale=>future(locale,{uncertainOnly:true}))});assert.equal(pending.changed,false);assert.equal(pending.collection.pendingChanges,1);
 const result=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(future)}),next=JSON.parse(await fs.readFile(paths.target));
 assert(result.changed);validatePatchUpdate(seed,next);assert.equal(next.patches.flatMap(p=>p.changes).length,66);assert.equal(latestHeroPatch(next,'genji').patch.patchId,'patch-2026-11-03');assert.equal(latestHeroPatch(next,'ana').patch.patchId,'patch-2026-11-07');
 assert.equal(next.patches.find(p=>p.patchId==='patch-2026-11-07').reviewStatus,'partial');
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{assert.match(renderHeroPatch(next,'ana').textContent,/70 → 65/);assert.match(renderPatchNote(selectCurrentPatchNote(next)).textContent,/2026.11.08/);}finally{globalThis.document=prior;dom.window.close();}
 const revised=await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(locale=>future(locale,{after:60}))});assert(revised.changed);const revision=JSON.parse(await fs.readFile(paths.target));validatePatchUpdate(next,revision);assert.equal(revision.patches.filter(p=>p.patchId==='patch-2026-11-07').length,2);assert.equal(latestHeroPatch(revision,'ana').changes[0].after,60);
}));

test('month rollover queries current and recent months, retains November, and never crawls the full archive',async()=>isolated(async paths=>{
 const requests=[];
 const fetcher=async url=>{
  requests.push(url);const locale=url.includes('ko-kr')?'ko-kr':'en-us',dec=future(locale).replaceAll('2026-11-07','2026-12-07').replaceAll('2026년 11월 8일','2026년 12월 8일');
  return {ok:true,text:async()=>url.endsWith('/2026/11/')?html[locale]:url.endsWith('/2026/12/')?dec:dec+html[locale]};
 };
 const result=await prepareOfficialPatchUpdate({...paths,fetcher});assert(result.changed);assert.equal(requests.length,6);assert(result.collection.added.includes('patch-2026-12-07'));const archive=JSON.parse(await fs.readFile(paths.target));validatePatchUpdate(seed,archive);assert.equal(archive.patches.filter(p=>p.patchId==='patch-2026-11-03').length,1);
}));

test('D/F network, parser, invalid candidate and artifact failures keep the valid JSON and prohibit publication',async()=>isolated(async paths=>{
 const original=await fs.readFile(paths.target);
 for(const fetcher of [async()=>{throw Error('network unavailable');},async()=>({ok:true,text:async()=>'<html>changed structure</html>'})]){
  await assert.rejects(prepareOfficialPatchUpdate({...paths,fetcher}));assert((await fs.readFile(paths.target)).equals(original));assert.equal(JSON.parse(await fs.readFile(paths.report)).status,'failed');
 }
 await assert.rejects(prepareOfficialPatchUpdate({...paths,collector:async({target})=>{await fs.writeFile(target,JSON.stringify({schemaVersion:1,patches:[]}));return{pendingChanges:0};}}),/이력 삭제/);assert((await fs.readFile(paths.target)).equals(original));
 const candidate=join(paths.root,'artifact.json');await fs.writeFile(candidate,original);await assert.rejects(installPatchCandidate({target:paths.target,candidate,expectedDigest:'0'.repeat(64)}),/해시 불일치/);
 const invalid=structuredClone(seed);invalid.patches[0].changes[0].heroKey='unknown-hero';assert.throws(()=>validatePatchUpdate(seed,invalid),/등록되지/);
}));

test('publication artifact digest matches the exact candidate; install never touches another file',async()=>isolated(async paths=>{
 const candidate=join(paths.root,'candidate.json');await fs.copyFile(paths.target,candidate);const result=await prepareOfficialPatchUpdate({...paths,target:candidate,fetcher:fetchPage(future)});const protectedFile=join(paths.root,'protected.json');await fs.writeFile(protectedFile,'unchanged');
 assert.equal((await installPatchCandidate({candidate,target:paths.target,expectedDigest:result.candidateDigest})).changed,true);assert.equal(patchDigest(await fs.readFile(paths.target)),result.candidateDigest);assert.equal(await fs.readFile(protectedFile,'utf8'),'unchanged');assert.equal((await installPatchCandidate({candidate,target:paths.target,expectedDigest:result.candidateDigest})).changed,false);
}));

test('workflow YAML: once-daily KST schedule, no-change gates, narrow permissions/path, main SHA and same-run Pages serialization',async()=>{
 const load=async file=>{const doc=parseDocument(await fs.readFile(new URL(file,import.meta.url),'utf8'),{uniqueKeys:true});assert.deepEqual(doc.errors,[]);return doc.toJS();};
 const workflow=await load('../.github/workflows/official-patch-notes.yml'),pages=await load('../.github/workflows/pages.yml');
 assert.deepEqual(workflow.on.schedule,[{cron:'0 1 * * *'}]);assert(Object.hasOwn(workflow.on,'workflow_dispatch'));assert.equal(new Date('2026-11-09T01:00:00Z').toLocaleString('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}),'10:00');
 assert.equal(workflow.concurrency.group,pages.concurrency.group);assert.equal(workflow.concurrency['cancel-in-progress'],false);assert.deepEqual(workflow.permissions,{contents:'read'});
 const {prepare,publish}=workflow.jobs;assert.equal(publish.needs,'prepare');assert.match(publish.if,/changed == 'true'/);assert.deepEqual(publish.permissions,{contents:'write',pages:'write','id-token':'write'});
 for(const step of prepare.steps.filter(s=>s.run&&/npm test|npm run build|npm run verify:pages/.test(s.run)))assert.equal(step.if,"steps.patch.outputs.changed == 'true'");
 const shell=publish.steps.map(s=>s.run??'').join('\n');assert(shell.includes('git add -- public/data/patches/notes.json'));assert(shell.includes('git diff --cached --name-only'));assert(shell.includes('git ls-remote origin refs/heads/main'));assert(publish.steps.some(s=>s.env?.EXPECTED_SHA==='${{ github.sha }}'));assert(!/git add (?:\.|-A)|--force/.test(shell));assert(publish.steps.at(-1).uses.startsWith('actions/deploy-pages@'));
 assert(prepare.steps.some(s=>s.if==='always()'&&s.with?.name==='official-patch-review'));assert(!JSON.stringify(workflow).includes('23 */6'));
});

test('publication revision gate: only unchanged main or exact previous notes-only commit can deploy/resume',()=>{
 const expected='a'.repeat(40),head='b'.repeat(40),digest='c'.repeat(64),base={expected,head,remote:head,parent:expected,paths:['public/data/patches/notes.json'],currentDigest:digest,candidateDigest:digest};
 assert.equal(publicationRevisionMode({...base,head:expected,remote:expected}),'fresh');assert.equal(publicationRevisionMode(base),'resume');
 for(const overrides of [{remote:'d'.repeat(40)},{parent:'e'.repeat(40)},{paths:['src/domain/meta.js']},{paths:['public/data/patches/notes.json','src/main.js']},{currentDigest:'f'.repeat(64)}])assert.throws(()=>publicationRevisionMode({...base,...overrides}));
});

test('current production archive preserves all original 65 facts without restricting future patch growth',async()=>{
 const before=await read('./fixtures/official-patch-november-complete.json'),after=await read('../public/data/patches/notes.json');validatePatchUpdate(before,after);assert(after.patches.flatMap(p=>p.changes).length>=65);
});

test('isolated new-patch production build includes actual validated candidate and passes Pages path validation',async()=>isolated(async paths=>{
 await prepareOfficialPatchUpdate({...paths,fetcher:fetchPage(future)});
 const publicDir=join(paths.root,'public');await fs.cp(resolve('public'),publicDir,{recursive:true});await fs.copyFile(paths.target,join(publicDir,'data/patches/notes.json'));
 await build({configFile:false,root:resolve('.'),base:'/HOW/',publicDir,logLevel:'silent',build:{outDir:join(paths.root,'dist'),emptyOutDir:true}});
 const built=JSON.parse(await fs.readFile(join(paths.root,'dist/data/patches/notes.json')));assert.equal(selectCurrentPatchNote(built).sourceId,'patch-2026-11-07');
 const result=await promisify(execFile)(process.execPath,[resolve('scripts/verify-pages.js')],{cwd:paths.root,env:{...process.env,VITE_BASE_PATH:'/HOW/'}});assert.match(result.stdout,/Pages assets verified/);
}));
