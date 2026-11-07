import {mkdir,open,readFile,rename,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {buildPerkArchive,normalizePerkArchive,PERK_API_URL,PERK_ARCHIVE_FILE} from '../src/models/perkArchiveModel.js';
// A single atomically replaced JSON is the complete publication unit. No second
// index can point at a partially written generation; no collection runs in browsers.
export async function collectOverlookerPerks({root=resolve('public/data/perks'),fetcher=globalThis.fetch,now=Date.now,timeoutMs=20000,io={open,rename,unlink,readFile,mkdir}}={}){
 await io.mkdir(root,{recursive:true});
 const lockPath=join(root,'.collector.lock'),target=join(root,PERK_ARCHIVE_FILE),temporary=join(root,`.perks-${randomUUID()}.tmp`);
 let lock,owned=false;
 try{
  lock=await io.open(lockPath,'wx');
  let previous=null;
  try{previous=JSON.parse(await io.readFile(target,'utf8'));normalizePerkArchive(previous);}catch(e){if(e.code!=='ENOENT')throw new Error(`기존 파일 검증 실패 · 원본 보존: ${e.message}`);}
  const controller=new AbortController();let timer;
  const {response,body}=await Promise.race([(async()=>{const response=await fetcher(PERK_API_URL,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error(`OverLooker HTTP ${response.status} · 기존 파일 보존${response.headers?.get('retry-after')?` · Retry-After ${response.headers.get('retry-after')}`:''}`);
   return {response,body:await response.json()};})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('OverLooker 수집 시간 초과'));},timeoutMs);})]).finally(()=>clearTimeout(timer));
  const age=response.headers?.get('age');
  const archive=buildPerkArchive(body,{collectedAt:new Date(now()).toISOString(),responseDate:response.headers?.get('date')??null,cacheControl:response.headers?.get('cache-control')??null,ageSeconds:age!==null&&age!==undefined&&/^\d+$/.test(age)?Number(age):null});
  const changes=[];
  if(previous)for(const [hero,row]of Object.entries(archive.heroes)){for(const tier of ['minor','major'])for(const tuple of row[tier]){const old=previous.heroes[hero][tier].find(p=>p[0]===tuple[0]);if(JSON.stringify(old)!==JSON.stringify(tuple))changes.push({hero,tier,id:tuple[0],before:old?.slice(1)??null,after:tuple.slice(1)});}if(row.providerSampleSize!==previous.heroes[hero].providerSampleSize)changes.push({hero,field:'providerSampleSize',before:previous.heroes[hero].providerSampleSize,after:row.providerSampleSize});}
  const text=JSON.stringify(archive)+'\n';
  const file=await io.open(temporary,'wx');owned=true;try{await file.writeFile(text,'utf8');await file.sync();}finally{await file.close();}
  normalizePerkArchive(JSON.parse(await io.readFile(temporary,'utf8')));
  await io.rename(temporary,target);owned=false;
  return {file:target,collectedAt:archive.collectedAt,previous:previous?{heroes:previous.heroCount,perks:previous.perkCount}:null,heroes:archive.heroCount,perks:archive.perkCount,bytes:Buffer.byteLength(text),missing:[],changes,firstCollection:previous===null};
 }finally{if(owned)await io.unlink(temporary);if(lock){await lock.close();await io.unlink(lockPath);}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length>2){console.error('사용법: node scripts/collect-overlooker-perks.js (실제 API 수집 및 로컬 저장)');process.exitCode=1;}
 else try{console.log(JSON.stringify(await collectOverlookerPerks(),null,2));}catch(e){console.error(`특전 통계 수집 실패: ${e.message}`);process.exitCode=1;}
}
