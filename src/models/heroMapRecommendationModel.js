import {statisticsQuery} from './statisticsModel.js';
import {rateStatus,statisticsNeedsReview} from './statisticsQuality.js';
import {OBSERVATION_TOLERANCE_MS,validatedProvenance} from './statisticsProvenance.js';
export const HERO_MAP_POLICY=Object.freeze({version:'hero-map-win-v1',limit:3,lowPickRate:1,maxSpanMs:OBSERVATION_TOLERANCE_MS});
export function recommendHeroMaps(batch,heroKey,filters,{now=Date.now()}={}){
 const output={status:batch?.status??'loading',rows:[],checked:batch?.frames?.length??0,total:batch?.total??0,partial:!!batch?.partial,filters:{...filters,map:'all'},pool:'provider-standard',observedAt:null};
 if(batch?.status!=='ready')return output;
 const frames=(batch.frames??[]).filter(f=>!f.stale&&!f.error&&Number.isFinite(Date.parse(f.fetchedAt))&&Date.parse(f.fetchedAt)<=now&&f.expiresAt>now);
 const newest=Math.max(-Infinity,...frames.map(f=>Date.parse(f.fetchedAt)));output.observedAt=Number.isFinite(newest)?new Date(newest).toISOString():null;
 const candidates=[],seen=new Set(),reference=frames.find(f=>Date.parse(f.fetchedAt)===newest),origin=reference&&validatedProvenance(reference);
 for(const frame of frames.sort((a,b)=>Date.parse(b.fetchedAt)-Date.parse(a.fetchedAt))){
  try{if(frame.patch!==reference?.patch||(frame.statisticsWindow??'unverified-patch-window')!==(reference?.statisticsWindow??'unverified-patch-window')||JSON.stringify(validatedProvenance(frame)?.members)!==JSON.stringify(origin?.members)||validatedProvenance(frame)?.kind!==origin?.kind)continue;if(statisticsQuery({...frame.filters,map:'all'})!==statisticsQuery({...filters,map:'all'})||!batch.maps.some(m=>m.key===frame.filters.map)||newest-Date.parse(frame.fetchedAt)>HERO_MAP_POLICY.maxSpanMs||!validatedProvenance(frame))continue;}catch{continue;}
  const row=frame.records?.find(r=>r.hero===heroKey);if(statisticsNeedsReview(row)||rateStatus(row,'winRate')!=='available'||!Number.isFinite(row?.winRate))continue;
  if(seen.has(frame.filters.map))continue;seen.add(frame.filters.map);
  candidates.push({map:frame.filters.map,winRate:row.winRate,pickRate:rateStatus(row,'pickRate')==='available'?row.pickRate:null,lowPick:rateStatus(row,'pickRate')==='available'&&row.pickRate<HERO_MAP_POLICY.lowPickRate,fetchedAt:frame.fetchedAt});
 }
 output.rows=candidates.sort((a,b)=>b.winRate-a.winRate||a.map.localeCompare(b.map,'en')).slice(0,HERO_MAP_POLICY.limit);
 output.partial=output.partial||frames.length<output.total||candidates.length<output.total;
 return {...output,status:output.rows.length?'ready':'empty'};
}
