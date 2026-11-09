import * as fs from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {extractOfficialPatches} from './lib/officialPatchParser.js';
import {normalizeOfficialPatches} from '../src/models/officialPatchModel.js';
import {pairAutomaticChange,PATCH_NORMALIZATION_VERSION} from './lib/patchChangeRules.js';
import abilityNames from '../src/data/patchAbilityNames.json' with {type:'json'};
export function reviewOfficialPatches(detected,english,review,existing={schemaVersion:1,patches:[]},{automatic=false}={}){
 normalizeOfficialPatches(existing);const added=[],updated=[],pending=[],skipped=[],patches=[...existing.patches];
 for(const p of detected.patches){
  const en=english.patches.find(e=>e.patchId===p.patchId);
  const old=existing.patches.find(e=>e.patchId===p.patchId&&e.sourceHash===p.sourceHash&&e.sourceHashEn===en?.sourceHash);
  const r=review?.patches?.find(r=>r.patchId===p.patchId&&r.sourceHash===p.sourceHash&&r.sourceHashEn===en?.sourceHash);
  if(!en){pending.push({...p,reason:'영문 교차 검증 불가'});continue;}
  const manual=new Map();for(const c of r?.changes??[]){const evidence=p.candidates.find(e=>e.id===c.id),englishEvidence=en.candidates.find(e=>e.id===c.englishId);if(!evidence||!evidence.heroKey||c.before!==evidence.before||c.after!==evidence.after||c.gameMode!==evidence.gameMode||!englishEvidence||englishEvidence.heroKey!==evidence.heroKey||englishEvidence.gameMode!==evidence.gameMode||englishEvidence.before!==c.before||englishEvidence.after!==c.after)throw new Error('검토 내용과 한/영 공식 변경이 일치하지 않습니다.');manual.set(c.id,c);}
  const changes=[],waiting=[];
  for(const evidence of p.candidates){
   const c=manual.get(evidence.id),previous=(old?.changes??existing.patches.filter(x=>x.patchId===p.patchId).flatMap(x=>x.changes)).find(x=>x.id===evidence.id&&x.before===evidence.before&&x.after===evidence.after&&x.unit===evidence.unit&&en.candidates.some(e=>e.id===x.englishEvidenceId)),auto=automatic?pairAutomaticChange(evidence,en.candidates,abilityNames,p.candidates):null;
   if(previous){changes.push(previous.abilityKey?.endsWith(':')?{...previous,abilityKey:`${evidence.heroKey}:base-stats`}:previous);continue;}
   if(!c&&!auto){waiting.push(evidence);continue;}
   const peer=c?en.candidates.find(e=>e.id===c.englishId):auto.peer;
   const {evidenceText,numeric,...facts}=evidence;
   const slug=peer.abilityName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'base-stats';
   changes.push({...facts,abilityKey:`${evidence.heroKey}:${slug}`,changeType:c?.changeType??auto.changeType,category:c?.category??facts.category,summaryKo:c?.summaryKo??facts.summaryKo,englishEvidenceId:peer.id,verificationMethod:c?'bilingual-manual-review':'bilingual-numeric-rule',verificationStatus:'verified'});
  }
  if(waiting.length)pending.push({...p,candidates:waiting,reason:'식별·수치 또는 문맥 검토 필요'});
  if(!changes.length&&!r){continue;}
  const row={patchId:p.patchId,publishedDate:p.publishedDate,localizedTitleDate:p.localizedTitleDate,officialTitle:p.officialTitle,sourceUrl:p.sourceUrl,sourceUrlEn:en.sourceUrl,sourceHash:p.sourceHash,sourceHashEn:en.sourceHash,type:p.type,effectiveAt:null,statisticsWindowStatus:'unverified',verificationStatus:'verified',reviewedAt:r?.reviewedAt??old?.reviewedAt??new Date().toISOString().slice(0,10),summaryKo:old?.summaryKo??r?.summaryKo??`공식 노트에서 영웅 ${new Set(changes.map(c=>c.heroKey)).size}명의 변경 ${changes.length}건을 확인했습니다. 모드별로 구분해 제공합니다.`,...((old?.highlightsKo??r?.highlightsKo)?{highlightsKo:old?.highlightsKo??r.highlightsKo}:{}),normalizationVersion:PATCH_NORMALIZATION_VERSION,coverage:{sourceCandidates:p.candidates.length,verified:changes.length,pending:waiting.length,excluded:p.excluded?.length??0},changes};
  if(old){if(old.normalizationVersion===row.normalizationVersion&&JSON.stringify(old.changes)===JSON.stringify(changes)&&JSON.stringify(old.coverage)===JSON.stringify(row.coverage)){skipped.push(p.patchId);continue;}patches[patches.indexOf(old)]=row;updated.push(p.patchId);}else{patches.push(row);added.push(p.patchId);}
 }
 const archive={schemaVersion:1,patches};normalizeOfficialPatches(archive);return {archive,added,updated,skipped,pending};
}
async function atomicWrite(file,data,io){await io.mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';let owned=false;try{const handle=await io.open(temp,'wx');owned=true;try{await handle.writeFile(JSON.stringify(data,null,2)+'\n');await handle.sync();}finally{await handle.close();}const check=JSON.parse(await io.readFile(temp,'utf8'));normalizeOfficialPatches(check);await io.rename(temp,file);owned=false;}finally{if(owned)await io.unlink(temp);}}
async function collectInternal({apply=false,review=null,report=null,target=resolve('public/data/patches/notes.json'),fetcher=globalThis.fetch,io=fs}={}){
 if(report&&resolve(report)===resolve(target))throw new Error('검토 보고서로 정상 JSON을 덮어쓸 수 없습니다.');
 const heroes=JSON.parse(await fs.readFile(new URL('../src/data/patchHeroNames.json',import.meta.url),'utf8'));
 const pages=[];
 for(const locale of ['ko-kr','en-us']){
  async function get(url){const r=await fetcher(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`공식 패치 요청 실패 (${r.status})`);const html=await r.text();if(html.length>2000000)throw new Error('공식 HTML 크기 제한 초과');return html;}
  const url=`https://overwatch.blizzard.com/${locale}/news/patch-notes/live/`,first=extractOfficialPatches(await get(url),{locale,sourceUrl:url,heroes});
  const month=first.patches[0].publishedDate.slice(0,7).replace('-','/'),monthly=`${url}${month}/`;
  const page=extractOfficialPatches(await get(monthly),{locale,sourceUrl:monthly,heroes});
  if(!first.patches.every(p=>page.patches.some(e=>e.patchId===p.patchId)))throw new Error('공식 월별 고정 링크 검증 실패');pages.push(page);
 }
 let existing={schemaVersion:1,patches:[]};try{existing=JSON.parse(await io.readFile(target,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const result=reviewOfficialPatches(pages[0],pages[1],review,existing,{automatic:true});
 if(report){await io.mkdir(dirname(report),{recursive:true});await io.writeFile(report,JSON.stringify({checkedAt:new Date().toISOString(),detected:pages[0],english:pages[1],added:result.added,skipped:result.skipped,pending:result.pending},null,2)+'\n');}
 const changed=result.added.length+result.updated.length;
 if(apply&&changed)await atomicWrite(target,result.archive,io);
 return {applied:!!(apply&&changed),detected:pages[0].patches.map(p=>p.patchId),added:result.added,updated:result.updated,skipped:result.skipped,pending:result.pending.map(p=>p.patchId),pendingChanges:result.pending.reduce((n,p)=>n+p.candidates.length,0),heroChanges:result.archive.patches.reduce((n,p)=>n+p.changes.length,0)};
}
export async function collectOfficialPatchNotes(options={}){
 const target=options.target??resolve('public/data/patches/notes.json'),io=options.io??fs;
 if(!options.apply)return collectInternal({...options,target,io});
 await io.mkdir(dirname(target),{recursive:true});const lock=await io.open(target+'.lock','wx');
 try{return await collectInternal({...options,target,io});}finally{await lock.close();await io.unlink(target+'.lock');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),allowed=['--dry-run','--apply','--review','--report'];
 try{let apply=false,review,report;for(let i=0;i<args.length;i++){if(!allowed.includes(args[i]))throw new Error('허용되지 않은 인자');if(args[i]==='--apply')apply=true;if(args[i]==='--review')review=JSON.parse(await fs.readFile(args[++i],'utf8'));if(args[i]==='--report')report=resolve(args[++i]);}if(args.includes('--apply')&&args.includes('--dry-run'))throw new Error('apply/dry-run 동시 사용 금지');console.log(JSON.stringify(await collectOfficialPatchNotes({apply,review,report}),null,2));}catch(e){console.error(`패치 수집 실패 · 기존 자료 보존: ${e.message}`);process.exitCode=1;}
}
