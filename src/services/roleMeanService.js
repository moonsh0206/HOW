import {normalizeRoleMeanArchive,roleRoster,MEAN_ROLES} from '../models/roleMeanModel.js';
import {statisticsQuery} from '../models/statisticsModel.js';
import {compatibleDashboardObservation} from '../models/metaDashboardModel.js';
export function createRoleMeanService({base='/',fetcher=globalThis.fetch,now=Date.now}={}){
 let cached,pending,expires=0;
 async function read(){if(cached&&now()<expires)return cached;if(pending)return pending;
  pending=(async()=>{const response=await fetcher(base+'data/role-means/observations.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Role mean archive unavailable');cached=normalizeRoleMeanArchive(await response.json());expires=now()+600000;return cached;})();try{return await pending;}finally{pending=null;}
 }
 return {async getHistory(filters,{days=7,heroes}={}){
  if(![7,30].includes(days))throw Error('Invalid role history period');const archive=await read(),roster=roleRoster(heroes);if(MEAN_ROLES.some(role=>JSON.stringify(roster[role])!==JSON.stringify(archive.roster[role])))throw Error('Role roster changed');
  const end=now(),start=end-days*86400000,query=statisticsQuery(filters),rows=archive.observations.filter(r=>statisticsQuery(r.filters)===query&&Date.parse(r.collectedAt)>=start&&Date.parse(r.collectedAt)<=end).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
  const reference=rows.at(-1),daily=new Map();for(const row of rows)if(compatibleDashboardObservation(row,reference,filters))daily.set(row.date,row);
  const series=MEAN_ROLES.map(role=>({role,points:[...daily].map(([day,row])=>({day,time:Date.parse(row.collectedAt),observedAt:row.collectedAt,...row.roles[role],sources:row.sources}))}));
  return {series,days,aggregateVersion:archive.aggregateVersion,method:archive.method,available:series.some(s=>s.points.filter(p=>p.value!==null).length>=2),observedUntil:new Date(end).toISOString(),warningCount:0};
 }};
}
