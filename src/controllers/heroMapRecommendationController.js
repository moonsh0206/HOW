import {statisticsQuery} from '../models/statisticsModel.js';
import {HERO_MAP_POLICY,recommendHeroMaps} from '../models/heroMapRecommendationModel.js';
import {mapPerformanceEnd} from '../services/heroMapPerformance.js';

// API cache expiry requests a refresh; it must not erase an already validated
// observation on an unrelated render. Retained observations are labelled stale.
export function createHeroMapRecommendationController({service,onChange=()=>{},now=Date.now}){
 const observations=new Map();let current=null,request=null,generation=0;
 function cancel(){++generation;request?.abort();request=null;}
 function start(entry){
  cancel();const token=generation,abort=new AbortController();request=abort;
  entry.refreshing=!!entry.recommendation?.rows.length;entry.status=entry.refreshing?'ready':'loading';entry.refreshError=false;
  Promise.resolve().then(()=>service.get(entry.filters,{signal:abort.signal})).then(batch=>{
   if(token!==generation||current!==entry||abort.signal.aborted)return;
   const calculationStarted=globalThis.performance?.now?.()??0,recommendation=recommendHeroMaps(batch,entry.heroKey,entry.filters,{now:now()});
   mapPerformanceEnd(batch.traceId,'top3-calculated',{hero:entry.heroKey,calculationMs:(globalThis.performance?.now?.()??0)-calculationStarted});
   if(recommendation.rows.length||!entry.recommendation?.rows.length||!recommendation.partial){entry.batch=batch;entry.recommendation=recommendation;entry.stale=false;}
   else{entry.stale=true;entry.refreshError=true;}
   entry.status=entry.recommendation?.rows.length?'ready':recommendation.status;
   const expires=Math.min(batch.expiresAt??Infinity,...(batch.frames??[]).map(frame=>frame.expiresAt));
   entry.expiresAt=Number.isFinite(expires)&&expires>now()&&!entry.refreshError?expires:now()+60000;
  }).catch(error=>{
   if(token!==generation||current!==entry||abort.signal.aborted)return;
   entry.refreshError=true;entry.stale=!!entry.recommendation?.rows.length;entry.status=entry.stale?'ready':'error';entry.expiresAt=now()+60000;
  }).finally(()=>{if(token===generation&&current===entry&&!abort.signal.aborted){entry.refreshing=false;request=null;onChange();}});
 }
 return {
  setContext(heroKey,filters){
   if(!service)return null;
   const cohort={...filters,map:'all'},key=JSON.stringify(['overfast',HERO_MAP_POLICY.version,heroKey,statisticsQuery(cohort)]);
   if(current?.key!==key){cancel();current=observations.get(key)??{key,heroKey,filters:cohort,status:'idle',expiresAt:0};observations.set(key,current);if(observations.size>50)observations.delete(observations.keys().next().value);}
   if(!request&&current.expiresAt<=now()){if(current.recommendation?.rows.length)current.stale=true;start(current);}
   return this.getState();
  },
  getState(){if(!current)return null;return {...current.batch,status:current.status,recommendation:current.recommendation?{...current.recommendation,refreshing:current.refreshing,stale:current.stale,refreshError:current.refreshError}:null};},
  retry(){if(current)start(current);},
  leave(){cancel();if(current?.status==='loading')current.expiresAt=0;if(current)current.refreshing=false;current=null;},
  destroy(){this.leave();observations.clear();},
 };
}
