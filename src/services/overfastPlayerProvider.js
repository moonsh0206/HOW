import {playerQuery,playerPath,normalizePlayerSearch,normalizePlayerSummary,normalizePlayerStats} from '../models/playerModel.js';
export class PlayerLookupError extends Error{constructor(code,message,retryAt=null){super(message);this.code=code;this.retryAt=retryAt;}}
// Provider contract: search(query,offset), summary(id), competitive(id). No hero cohort dependencies.
export function createOverfastPlayerProvider({fetcher=globalThis.fetch,now=Date.now,timeoutMs=15000,base='https://overfast-api.tekrop.fr'}={}){
 const cache=new Map(),pending=new Map(),failures=new Map();
 function get(path,normalize){
  const hit=cache.get(path);if(hit&&hit.expires>now())return Promise.resolve({...hit.value,cached:true});
  if(pending.has(path))return pending.get(path);
  const failure=failures.get(path);if(failure?.retryAt>now())return Promise.reject(failure);
  const work=(async()=>{await Promise.resolve();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{const response=await fetcher(base+path,{signal:controller.signal});
    if(!response.ok){let body={};try{body=await response.json();}catch{}
     const messages={403:['private','비공개 프로필입니다.'],404:['not-found','플레이어를 찾을 수 없습니다.'],422:['input','검색 조건을 확인해 주세요.'],429:['rate-limit','API 호출 제한입니다. 잠시 후 다시 시도해 주세요.'],503:['upstream-limit','Blizzard 조회가 제한되었거나 일시적으로 지연되고 있습니다.']};
     const [code,message]=messages[response.status]??['server',`전적 서버 오류입니다. (HTTP ${response.status})`];
     const header=response.headers?.get('retry-after'),seconds=header&&/^\d+(\.\d+)?$/.test(header)?Number(header):header?Math.max(0,(Date.parse(header)-now())/1000):Number(body.retry_after);
     throw new PlayerLookupError(code,message,now()+Math.max(1000,Number.isFinite(seconds)?seconds*1000:30000));
    }
    const data=normalize(await response.json()),ageHeader=response.headers?.get('age'),age=ageHeader!=null&&/^\d+$/.test(ageHeader)?Number(ageHeader):null;
    const ttlHeader=Number(response.headers?.get('x-cache-ttl')),ttl=ttlHeader>0?Math.min(600,ttlHeader):600;
    const value={data,fetchedAt:new Date(now()).toISOString(),providerAgeSeconds:age,providerStale:response.headers?.get('x-cache-status')==='stale',cached:false};
    cache.set(path,{value,expires:now()+Math.max(0,ttl-(age??0))*1000});failures.delete(path);return value;
   }catch(error){const e=error instanceof PlayerLookupError?error:new PlayerLookupError(error.name==='AbortError'?'timeout':error instanceof TypeError?'network':'invalid',error.name==='AbortError'?'전적 조회 시간이 초과되었습니다.':error instanceof TypeError?'네트워크 또는 CORS 연결을 확인해 주세요.':error.message,now()+5000);failures.set(path,e);throw e;
   }finally{clearTimeout(timer);pending.delete(path);}
  })();pending.set(path,work);return work;
 }
 return {name:'OverFast API',search(query,offset=0){const q=playerQuery(query);if(!Number.isInteger(offset)||offset<0)throw Error('잘못된 검색 페이지입니다.');return get('/players?'+new URLSearchParams({name:q,limit:'20',offset:String(offset)}),normalizePlayerSearch);},summary(id){return get(`/players/${playerPath(id)}/summary`,normalizePlayerSummary);},competitive(id){return get(`/players/${playerPath(id)}/stats/summary?`+new URLSearchParams({gamemode:'competitive',platform:'pc'}),normalizePlayerStats);}};
}
