import * as fs from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {collectOfficialPatchNotes} from './collect-official-patch-notes.js';
import {patchDigest,validatePatchUpdate} from './lib/patchPublication.js';

export async function prepareOfficialPatchUpdate({target=resolve('public/data/patches/notes.json'),report=resolve('.artifacts/official-patch-update.json'),review=null,fetcher=globalThis.fetch,output=null,collector=collectOfficialPatchNotes}={}){
 target=resolve(target);report=resolve(report);if(target===report)throw Error('보고서 경로 충돌');
 await fs.mkdir(dirname(report),{recursive:true});
 const stage=target+'.candidate-'+randomUUID()+'.json';let lock,owned=false;
 try{
  lock=await fs.open(target+'.update.lock','wx');
  const original=await fs.readFile(target),before=JSON.parse(original);await fs.writeFile(stage,original,{flag:'wx'});owned=true;
  const collection=await collector({target:stage,apply:true,review,fetcher,report:resolve(dirname(report),'official-patch-detection.json')});
  const candidate=await fs.readFile(stage),after=JSON.parse(candidate),validation=validatePatchUpdate(before,after);
  const changed=!original.equals(candidate),result={checkedAt:new Date().toISOString(),status:changed?'candidate':collection.pendingChanges?'review-required':'unchanged',changed,candidateDigest:patchDigest(candidate),collection,validation};
  // All validation happens before replacement. A concurrent local writer wins.
  if(changed){if(!(await fs.readFile(target)).equals(original))throw Error('수집 중 원본이 변경되어 게시 차단');await fs.rename(stage,target);owned=false;}
  await fs.writeFile(report,JSON.stringify(result,null,2)+'\n');
  if(output)await fs.appendFile(output,`changed=${changed}\ncandidate_digest=${result.candidateDigest}\npending=${collection.pendingChanges}\n`);
  return result;
 }catch(error){
  await fs.writeFile(report,JSON.stringify({checkedAt:new Date().toISOString(),status:'failed',changed:false,error:error.message},null,2)+'\n');throw error;
 }finally{if(owned)await fs.unlink(stage);if(lock){await lock.close();await fs.unlink(target+'.update.lock');}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const review=JSON.parse(await fs.readFile(resolve('docs/research/official-patches/review-complete.json'),'utf8'));console.log(JSON.stringify(await prepareOfficialPatchUpdate({review,output:process.env.GITHUB_OUTPUT??null}),null,2));}
 catch(error){console.error(`공식 패치 갱신 차단: ${error.message}`);process.exitCode=1;}
}
