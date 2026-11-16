import {validateRankArchive} from '../models/rankArchiveModel.js';
import {rankDay} from '../models/dailyRankModel.js';
export function createDailyRankService({base='/',fetcher=globalThis.fetch,now=Date.now}={}){
 let value,expires=0,pending,day;
 return {get(){const today=rankDay(new Date(now()).toISOString());if(value&&now()<expires&&day===today)return Promise.resolve(value);if(pending)return pending;
  pending=(async()=>{const response=await fetcher(`${base}data/ranks/current.json`,{signal:AbortSignal.timeout(12000),cache:'no-cache'});if(!response.ok)throw Error(`Rank archive unavailable (HTTP ${response.status})`);value=validateRankArchive(await response.json());day=today;expires=now()+300000;return value;})();pending.finally(()=>{pending=null;}).catch(()=>{});return pending;
 }};
}
