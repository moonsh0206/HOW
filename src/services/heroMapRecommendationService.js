import {statisticsQuery,validateFilters} from '../models/statisticsModel.js';
import {HERO_MAP_POLICY} from '../models/heroMapRecommendationModel.js';
import {mapPerformanceStart,mapPerformanceMark,mapPerformanceEnd} from './heroMapPerformance.js';
// Cache complete map cohorts, not individual heroes. Existing statisticsService
// owns request sharing, composite calculation, timeouts and provider cooldowns.
export function createHeroMapRecommendationService({statisticsService,mapService,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms)),spacingMs=150,concurrency=2}={}){
 const cache=new Map(),pending=new Map();
 return {get(input,{signal,onProgress=()=>{}}={}){
  const trace=mapPerformanceStart(),filters=validateFilters({...input,map:'all'}),key=JSON.stringify(['overfast',HERO_MAP_POLICY.version,statisticsQuery(filters)]),hit=cache.get(key);
  mapPerformanceEnd(trace,'cache-checked',{hit:!!hit&&hit.expires>now()});
  if(hit&&hit.expires>now()){mapPerformanceEnd(trace,'cache-hit');return Promise.resolve({...hit.result,traceId:trace});}
  const existing=pending.get(key);if(existing&&!existing.signal?.aborted){mapPerformanceEnd(trace,'shared-pending');return existing.promise;}
  const job={signal};job.promise=(async()=>{
   const maps=await mapService.getMaps(),frames=[],failures=[];let cursor=0,checked=0,halted=false,nextStart=now();
   mapPerformanceEnd(trace,'metadata-ready',{maps:maps.length});
   async function worker(){while(!halted){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const map=maps[cursor++];if(!map)return;const query={...filters,map:map.key};
    if(!statisticsService.canReuseStatistics?.(query)){const start=Math.max(now(),nextStart);nextStart=start+spacingMs;const delay=start-now();if(delay>0)await wait(delay);}
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(halted)return;
    mapPerformanceMark(trace,'statistics-start',{map:map.key});
    try{const frame=await statisticsService.getStatistics(query);if(statisticsQuery(frame.filters)!==statisticsQuery(query)||frame.stale||frame.error)throw Object.assign(new Error(frame.error||'Invalid map observation'),{retryAt:frame.retryAt});frames.push(frame);}
    catch(error){failures.push({map:map.key,error:error.message});if(error.retryAt)halted=true;}
    mapPerformanceMark(trace,'statistics-ready',{map:map.key});onProgress({checked:++checked,total:maps.length});
   }}
   await Promise.all(Array.from({length:Math.min(2,Math.max(1,concurrency),maps.length)},worker));
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
   const result={status:'ready',maps,frames,total:maps.length,traceId:trace,expiresAt:Math.max(now()+60000,frames.length?Math.min(...frames.map(f=>f.expiresAt)):0),failures,partial:frames.length!==maps.length};
   // Do not retain a failed/partial scan as a complete recommendation dataset.
   if(!result.partial&&frames.length)cache.set(key,{result,expires:Math.min(...frames.map(f=>f.expiresAt))});
   mapPerformanceEnd(trace,'collection-complete',{maps:maps.length,checked,partial:result.partial});return result;
  })().catch(error=>{mapPerformanceEnd(trace,'collection-error',{name:error.name});throw error;}).finally(()=>{if(pending.get(key)===job)pending.delete(key);});pending.set(key,job);return job.promise;
 }};
}
