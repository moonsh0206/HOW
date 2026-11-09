import * as fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {patchDigest,validatePatchUpdate} from './lib/patchPublication.js';

export async function installPatchCandidate({candidate,target=resolve('public/data/patches/notes.json'),expectedDigest}={}){
 if(!/^[a-f0-9]{64}$/.test(expectedDigest??''))throw Error('빌드된 후보 해시 누락');
 const bytes=await fs.readFile(candidate),original=await fs.readFile(target);
 if(patchDigest(bytes)!==expectedDigest)throw Error('검증된 빌드와 게시 후보 해시 불일치');
 validatePatchUpdate(JSON.parse(original),JSON.parse(bytes));
 if(original.equals(bytes))return {changed:false};
 const temp=target+'.publish-'+randomUUID()+'.tmp';let owned=false;
 try{await fs.writeFile(temp,bytes,{flag:'wx'});owned=true;if(!(await fs.readFile(target)).equals(original))throw Error('원본 변경으로 설치 차단');await fs.rename(temp,target);owned=false;return {changed:true};}
 finally{if(owned)await fs.unlink(temp);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(await installPatchCandidate({candidate:resolve('.artifacts/publication/notes.json'),expectedDigest:process.env.EXPECTED_PATCH_DIGEST}));}catch(error){console.error(error.message);process.exitCode=1;}
}
