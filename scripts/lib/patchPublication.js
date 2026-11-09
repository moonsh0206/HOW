import {createHash} from 'node:crypto';
import {normalizeOfficialPatches} from '../../src/models/officialPatchModel.js';
import heroes from '../../src/data/patchHeroNames.json' with {type:'json'};

export const patchDigest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function publicationRevisionMode({expected,head,remote,parent,paths=[],currentDigest,candidateDigest}){
 if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(expected??'')||head!==remote)throw Error('main SHA 검증 실패');
 if(head===expected)return 'fresh';
 if(parent===expected&&paths.length===1&&paths[0]==='public/data/patches/notes.json'&&/^[a-f0-9]{64}$/.test(candidateDigest??'')&&currentDigest===candidateDigest)return 'resume';
 throw Error('빌드 이후 main 변경 · 이전 후보 게시 차단');
}
export function validatePatchUpdate(before,after){
 normalizeOfficialPatches(before);normalizeOfficialPatches(after);
 const keys=new Set(heroes.map(h=>h.key));
 for(const p of after.patches){
  if(p.coverage&&(!Number.isInteger(p.coverage.pending)||p.coverage.pending<0||p.coverage.verified!==p.changes.length||p.coverage.sourceCandidates!==p.coverage.verified+p.coverage.pending))throw Error('패치 부분 반영/검토 건수 불일치');
  if(p.reviewStatus&&p.reviewStatus!==(p.coverage?.pending>0?'partial':'complete'))throw Error('패치 검토 상태 불일치');
  for(const c of p.changes)if(!keys.has(c.heroKey))throw Error('등록되지 않은 영웅 변경 게시 차단');
 }
 // Old revisions and every previously verified fact must survive. A revision with
 // the same hash may be enriched by a later review, but cannot erase earlier facts.
 for(const old of before.patches){
  const preserved=after.patches.find(p=>p.patchId===old.patchId&&p.sourceHash===old.sourceHash&&p.sourceHashEn===old.sourceHashEn);
  if(!preserved)throw Error('기존 패치 이력 삭제 차단');
  for(const c of old.changes)if(!preserved.changes.some(next=>JSON.stringify(next)===JSON.stringify(c)))throw Error('기존 검증 변경사항 삭제/변조 차단');
 }
 return {patches:after.patches.length,changes:after.patches.reduce((n,p)=>n+p.changes.length,0),partial:after.patches.filter(p=>p.coverage?.pending>0).map(p=>({patchId:p.patchId,pending:p.coverage.pending,verified:p.changes.length}))};
}
