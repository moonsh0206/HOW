import { statisticsQuery } from '../models/statisticsModel.js';
export function createMapStatisticsController({statisticsService,onChange}) {
 let state={status:'idle',selectedMap:'all',baseline:null,error:''},context=null,signature='',generation=0;
 async function load(){
  if(!context||context.filters.map==='all')return;
  const token=++generation,filters={...context.filters,map:'all'};
  state={...state,status:'loading',baseline:null,error:''};
  try{const baseline=await statisticsService.getStatistics(filters);if(token!==generation)return;if(statisticsQuery(baseline.filters)!==statisticsQuery(filters))throw new Error('Baseline cohort mismatch');state={...state,status:'ready',baseline};}
  catch(error){if(token!==generation)return;state={...state,status:'error',error:error.message,baseline:null};}
  onChange();
 }
 return {
  setContext(key,filters){const next=key+':'+statisticsQuery(filters);if(signature===next)return;++generation;signature=next;context={key,filters:{...filters}};state={status:'idle',selectedMap:filters.map,baseline:null,error:''};load();},
  retry(){load();onChange();},getState(){return state;},leave(){++generation;context=null;signature='';state={status:'idle',selectedMap:'all',baseline:null,error:''};}
 };
}
