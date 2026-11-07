import {normalizePerkStatistics,perkHeroMapping} from '../models/perkSelectionModel.js';
import {normalizePerkArchive,PERK_ARCHIVE_FILE} from '../models/perkArchiveModel.js';
const ROOT='https://stats.overlooker.app/api/perks/';
// Kept for provider-contract tests/manual diagnostics; never a browser fallback.
export function createDirectPerkStatisticsService({fetcher=globalThis.fetch,now=Date.now,timeoutMs=12000,ttlMs=900000,concurrency=2}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>3)throw new Error('특전 통계 동시 요청 수는 1~3이어야 합니다.');
 const cache=new Map(),pending=new Map(),retry=new Map(),queue=[];let active=0,providerRetryAt=0;
 const acquire=()=>active<concurrency?(active++,Promise.resolve()):new Promise(resolve=>queue.push(resolve));
 const release=()=>{const next=queue.shift();if(next)next();else active--;};
 return {getHeroPerks(key){
  const mapping=perkHeroMapping(key);if(!mapping)return Promise.reject(new Error('특전 통계 영웅 매핑이 없습니다.'));
  const cached=cache.get(key);if(cached&&now()<cached.expiresAt)return Promise.resolve({...cached,cached:true});
  if(pending.has(key))return pending.get(key);
  const work=(async()=>{await acquire();let timer;try{
   const blocked=Math.max(providerRetryAt,retry.get(key)??0);if(blocked>now())throw new Error(`특전 통계 재시도 대기 중 · ${Math.ceil((blocked-now())/1000)}초 후 다시 시도해 주세요.`);
   retry.delete(key);
   const controller=new AbortController();
   const operation=(async()=>{const response=await fetcher(ROOT+mapping.providerHeroSlug,{signal:controller.signal,credentials:'omit',mode:'cors'});
    if(!response.ok){const header=response.headers?.get('retry-after');const delay=header?(/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-now()):60000;
     const until=now()+Math.max(1000,Number.isFinite(delay)?delay:60000);retry.set(key,until);if([429,503].includes(response.status))providerRetryAt=Math.max(providerRetryAt,until);
     throw new Error(`특전 통계 연결 실패 (${response.status})${[429,503].includes(response.status)?' · 제공처 재시도 대기':''}`);}
    const result=normalizePerkStatistics(await response.json(),key,{fetchedAt:new Date(now()).toISOString()});return {...result,cached:false,expiresAt:now()+ttlMs};})();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('특전 통계 응답 시간이 초과되었습니다.'));},timeoutMs);});
   const result=await Promise.race([operation,timeout]);cache.set(key,result);retry.delete(key);return result;
  }catch(error){if(!retry.has(key))retry.set(key,now()+30000);throw new Error(error instanceof TypeError?'특전 통계 네트워크/CORS 연결을 확인해 주세요.':error.message);
  }finally{clearTimeout(timer);release();}})();
  pending.set(key,work);work.finally(()=>{if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});return work;
 }};
}
// One shared, same-origin archive for every hero and every HOW filter cohort.
export function createPerkStatisticsService({base='/',fetcher=globalThis.fetch,now=Date.now,timeoutMs=12000,ttlMs=900000}={}){
 if(typeof base!=='string'||!/^\/(?!\/)/.test(base)||!base.endsWith('/')||base.includes('..')||/[?#\\]/.test(base))throw new Error('특전 JSON BASE_URL이 올바르지 않습니다.');
 const url=`${base}data/perks/${PERK_ARCHIVE_FILE}`;let archive,pending,expiresAt=0,retryAt=0;
 async function read(){
  if(archive&&now()<expiresAt)return {archive,cached:true};
  if(pending)return pending;
  if(now()<retryAt)throw new Error('특전 통계 파일 재시도 대기 중입니다. 잠시 후 다시 시도해 주세요.');
  pending=(async()=>{const controller=new AbortController();let timer;
   try{const parsed=await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal,cache:'no-cache',credentials:'same-origin'});if(!response.ok)throw new Error(`특전 통계 파일 연결 실패 (${response.status})`);return normalizePerkArchive(await response.json());})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('특전 통계 파일 응답 시간이 초과되었습니다.'));},timeoutMs);})]);
    archive=parsed;expiresAt=now()+ttlMs;return {archive,cached:false};
   }catch(error){retryAt=now()+30000;throw new Error(error instanceof TypeError?'동일 출처 특전 통계 파일의 연결을 확인해 주세요.':error.message);}finally{clearTimeout(timer);}
  })();try{return await pending;}finally{pending=null;}
 }
 return {async getHeroPerks(key){
  if(!perkHeroMapping(key))throw new Error('특전 통계 영웅 매핑이 없습니다.');
  const result=await read(),frame=result.archive.frames.get(key);
  if(!frame)throw new Error('OverLooker 선택률 데이터 미제공');
  return {...frame,cached:result.cached};
 }};
}
