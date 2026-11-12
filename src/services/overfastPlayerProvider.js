import {t} from '../i18n/i18n.js';
import {playerQuery,playerPath,normalizePlayerSearch,normalizePlayerSummary,normalizePlayerStats} from '../models/playerModel.js';
export class PlayerLookupError extends Error{constructor(code,message,retryAt=null){super(message);this.code=code;this.retryAt=retryAt;}}
// Provider contract: search(query,offset), summary(id), competitive(id). No hero cohort dependencies.
export function createOverfastPlayerProvider({fetcher=globalThis.fetch,now=Date.now,timeoutMs=15000,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),base='https://overfast-api.tekrop.fr'}={}){
 const cache=new Map(),pending=new Map(),failures=new Map(),retryRequests=new Set();
 const knownSpellings=new Map(),searchPending=new Map();
 function rememberSpelling(value){const folded=value.toLowerCase();if(!knownSpellings.has(folded))knownSpellings.set(folded,new Set());knownSpellings.get(folded).add(value);}
 function rememberPlayers(players){for(const player of players??[]){try{rememberSpelling(playerQuery(player.name));}catch{ /* Ignore invalid saved labels. */ }}}
 function search(query,offset=0){
  const q=playerQuery(query);if(!Number.isInteger(offset)||offset<0)throw Error(t("잘못된 검색 페이지입니다."));
  const key=JSON.stringify([q,offset]);if(searchPending.has(key))return searchPending.get(key);
  const work=(async()=>{
  const request=name=>get('/players?'+new URLSearchParams({name,limit:'20',offset:String(offset)}),normalizePlayerSearch);
  const exact=await request(q);
  if(exact.data.total){rememberSpelling(q);rememberPlayers(exact.data.players);return exact;}
  const spellings=knownSpellings.get(q.toLowerCase());
  // No guessing arbitrary case permutations. Exact successful searches always win.
  if(spellings?.size===1){const original=[...spellings][0];if(original!==q){const frame=await request(original);return {...frame,searchSpelling:original};}}
  return exact;
  })();searchPending.set(key,work);work.finally(()=>searchPending.delete(key)).catch(()=>{});return work;
 }
 function get(path,normalize,{retry=false}={}){
  const hit=cache.get(path);if(hit&&hit.expires>now())return Promise.resolve({...hit.value,cached:true});
  if(pending.has(path)){if(retry)retryRequests.add(path);return pending.get(path);}
  const failure=failures.get(path);if(failure?.retryAt>now())return Promise.reject(failure);
  if(retry)retryRequests.add(path);
  const work=(async()=>{await Promise.resolve();for(let attempt=0;;attempt++){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{const response=await fetcher(base+path,{signal:controller.signal});
    if(!response.ok){let body={};try{body=await response.json();}catch{}
     const messages={403:['private',t("비공개 프로필입니다.")],404:['not-found',t("플레이어를 찾을 수 없습니다.")],422:['input',t("검색 조건을 확인해 주세요.")],429:['rate-limit',t("API 호출 제한입니다. 잠시 후 다시 시도해 주세요.")],503:['upstream-limit',t("Blizzard 조회가 제한되었거나 일시적으로 지연되고 있습니다.")]};
     const [code,message]=messages[response.status]??['server',`전적 서버 오류입니다. (HTTP ${response.status})`];
     const header=response.headers?.get('retry-after'),seconds=header&&/^\d+(\.\d+)?$/.test(header)?Number(header):header?Math.max(0,(Date.parse(header)-now())/1000):Number(body.retry_after);
     const error=new PlayerLookupError(code,message,now()+Math.max(1000,Number.isFinite(seconds)?seconds*1000:30000));error.status=response.status;error.explicitRetryAfter=header!=null||body.retry_after!=null;throw error;
    }
    const data=normalize(await response.json()),ageHeader=response.headers?.get('age'),age=ageHeader!=null&&/^\d+$/.test(ageHeader)?Number(ageHeader):null;
    const ttlHeader=Number(response.headers?.get('x-cache-ttl')),ttl=ttlHeader>0?Math.min(600,ttlHeader):600;
    const value={data,fetchedAt:new Date(now()).toISOString(),providerAgeSeconds:age,providerStale:response.headers?.get('x-cache-status')==='stale'||age!==null&&age>=ttl,cached:false};
    cache.set(path,{value,expires:now()+(age!==null&&age>=ttl?30000:Math.max(0,ttl-(age??0))*1000)});failures.delete(path);return value;
   }catch(error){const e=error instanceof PlayerLookupError?error:new PlayerLookupError(error.name==='AbortError'?'timeout':error instanceof TypeError?'network':'invalid',error.name==='AbortError'?t("전적 조회 시간이 초과되었습니다."):error instanceof TypeError?t("네트워크 또는 CORS 연결을 확인해 주세요."):error.message,now()+5000);if((retry||retryRequests.has(path))&&attempt===0&&(e.code==='timeout'||[500,502,503,504].includes(e.status))&&!e.explicitRetryAfter){clearTimeout(timer);await wait(1000);continue;}failures.set(path,e);throw e;
   }finally{clearTimeout(timer);}}
  })();pending.set(path,work);work.finally(()=>{pending.delete(path);retryRequests.delete(path);}).catch(()=>{});return work;
 }
 return {name:'OverFast API',search,rememberPlayers,summary(id,options){return get(`/players/${playerPath(id)}/summary`,normalizePlayerSummary,options);},competitive(id,options){return get(`/players/${playerPath(id)}/stats/summary?`+new URLSearchParams({gamemode:'competitive',platform:'pc'}),normalizePlayerStats,options);}};
}
