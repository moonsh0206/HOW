import {statisticsQuery} from './statisticsModel.js';
import {validatedProvenance,OBSERVATION_TOLERANCE_MS} from './statisticsProvenance.js';
import {rateStatus} from './statisticsQuality.js';
export function mapComparisonScale(metric,values){
 if(metric==='winRate')return 100;
 const high=Math.max(0,...values.filter(Number.isFinite)),step=high<5?1:5;
 // Sub-percent values must not become full-height bars. No minimum bar height.
 return Math.min(100,Math.max(1,Math.ceil(high*1.15/step)*step));
}
export function buildMapComparison(state,stats,heroKey,metric='pickRate'){
 if(!['winRate','pickRate','banRate'].includes(metric))throw Error('Invalid comparison metric');
 const filters=stats.statsFilters,baseline=state.baseline,current=stats.statistics;
 const result={metric,filters,baseline,current,values:[null,null],statuses:['missing','missing'],difference:null,max:metric==='winRate'?100:1,warnings:[],status:'missing'};
 if(state.status==='loading'||stats.statsStatus==='loading')return {...result,status:'loading'};
 if(state.status==='error'||stats.statsStatus==='error')return {...result,status:'error',error:state.error||stats.statsError};
 if(!baseline||!current)return result;
 try{
  if(statisticsQuery(baseline.filters)!==statisticsQuery({...filters,map:'all'})||statisticsQuery(current.filters)!==statisticsQuery(filters)||filters.map==='all')return {...result,status:'incompatible'};
  const a=validatedProvenance(baseline),b=validatedProvenance(current);
  if(!a||!b||a.provider!==b.provider||a.kind!==b.kind||a.version!==b.version||JSON.stringify(a.members)!==JSON.stringify(b.members)||baseline.patch!==current.patch||(baseline.statisticsWindow??'unverified-patch-window')!==(current.statisticsWindow??'unverified-patch-window'))return {...result,status:'incompatible'};
 }catch{return {...result,status:'incompatible'};}
 const rows=[baseline,current].map(frame=>frame.records?.find(row=>row.hero===heroKey));
 result.statuses=rows.map(row=>rateStatus(row,metric));result.values=rows.map((row,i)=>result.statuses[i]==='available'?row[metric]:null);
 const times=[baseline,current].map(frame=>Date.parse(frame.fetchedAt));
 if(times.some(time=>!Number.isFinite(time)))result.warnings.push('unknown-time');else if(Math.abs(times[1]-times[0])>OBSERVATION_TOLERANCE_MS)result.warnings.push('different-time');
 if(baseline.stale||current.stale||stats.statsStatus==='stale')result.warnings.push('stale');
 if(result.values.every(Number.isFinite))result.difference=result.values[1]-result.values[0];
 return {...result,status:result.values.some(Number.isFinite)?'ready':'missing',max:mapComparisonScale(metric,result.values)};
}
