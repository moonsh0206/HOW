import { normalizeMaps } from '../models/mapModel.js';
export function createMapService({fetcher=globalThis.fetch,now=Date.now,timeoutMs=12000}={}) {
  let cache,expires=0,pending;
  return {getMaps(){
    if(cache&&now()<expires)return Promise.resolve(cache);
    if(pending)return pending;
    pending=(async()=>{
      await Promise.resolve();
      try{
        const response=await fetcher('https://overfast-api.tekrop.fr/maps',{signal:AbortSignal.timeout(timeoutMs)});
        if(!response.ok)throw new Error(`맵 목록 연결 실패 (${response.status})`);
        cache=normalizeMaps(await response.json());expires=now()+86400000;return cache;
      }catch(error){throw new Error(error.name==='TimeoutError'?'맵 목록 응답 시간이 초과되었습니다.':error instanceof TypeError?'맵 목록 네트워크 연결을 확인해 주세요.':error.message);}
      finally{pending=null;}
    })();return pending;
  }};
}
