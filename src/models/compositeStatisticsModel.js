import {divisionMembers,statisticsQuery} from './statisticsModel.js';
import {statisticsUsable,statisticsNeedsReview} from './statisticsQuality.js';
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
  const reviewDivisions=divisions.filter((d,i)=>statisticsNeedsReview(rows[i]));
  const missingDivisions=divisions.filter((d,i)=>!statisticsUsable(rows[i])&&!statisticsNeedsReview(rows[i]));
  const blocked=missingDivisions.length||reviewDivisions.length;
  const values=Object.fromEntries(fields.map(f=>[f,blocked?null:rows.reduce((sum,r)=>sum+r[f],0)/divisions.length]));
  return {hero,...values,missingDivisions,...(reviewDivisions.length?{reviewDivisions,quality:{fields:{winRate:'review'}}}:!blocked&&values.winRate===0&&rows.every(r=>r.quality?.fields?.winRate==='verified')?{quality:{fields:{winRate:'verified'}}}:{})};
 });
}
