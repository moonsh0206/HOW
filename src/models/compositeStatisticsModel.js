import {divisionMembers,statisticsQuery} from './statisticsModel.js';
const fields=['winRate','pickRate','banRate'];
// Complete case only: a missing rank never changes the denominator.
export function combineDivisionStatistics(filters,components){
 const divisions=divisionMembers(filters.division), maps=divisions.map(division=>{
  const result=components.find(c=>c.filters?.division===division);
  if(result&&statisticsQuery(result.filters)!==statisticsQuery({...filters,division}))throw new Error('복합 등급 조회 조건이 일치하지 않습니다.');
  return result;
 });
 const keys=[...new Set(maps.flatMap(c=>c?.records?.map(r=>r.hero)??[]))];
 return keys.map(hero=>{
  const rows=maps.map(c=>c?.records?.find(r=>r.hero===hero));
  const missingDivisions=divisions.filter((d,i)=>!fields.every(f=>Number.isFinite(rows[i]?.[f])&&rows[i][f]>=0&&rows[i][f]<=100));
  return {hero,...Object.fromEntries(fields.map(f=>[f,missingDivisions.length?null:rows.reduce((sum,r)=>sum+r[f],0)/divisions.length])),missingDivisions};
 });
}
