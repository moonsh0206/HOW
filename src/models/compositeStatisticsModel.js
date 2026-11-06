import {divisionMembers,statisticsQuery,isCompositeDivision} from './statisticsModel.js';
import {rateStatus} from './statisticsQuality.js';
const fields=['winRate','pickRate','banRate'];
// Complete case only: a missing rank never changes the denominator.
export function combineDivisionStatistics(filters,components){
 if(!isCompositeDivision(filters.division))throw new Error('개별 등급은 원본 통계를 사용합니다.');
 const divisions=divisionMembers(filters.division), maps=divisions.map(division=>{
  if(components.filter(c=>c.filters?.division===division).length>1)throw new Error('구성 등급이 중복되었습니다.');
  const result=components.find(c=>c.filters?.division===division);
  if(result&&statisticsQuery(result.filters)!==statisticsQuery({...filters,division}))throw new Error('복합 등급 조회 조건이 일치하지 않습니다.');
  return result;
 });
 const keys=[...new Set(maps.flatMap(c=>c?.records?.map(r=>r.hero)??[]))];
 return keys.map(hero=>{
  const rows=maps.map(c=>c?.records?.find(r=>r.hero===hero));
  const missingByMetric=Object.fromEntries(fields.map(f=>[f,divisions.filter((d,i)=>['missing','confirmed-missing'].includes(rateStatus(rows[i],f)))]));
  const reviewByMetric=Object.fromEntries(fields.map(f=>[f,divisions.filter((d,i)=>rateStatus(rows[i],f)==='review')]));
  const missingDivisions=divisions.filter(d=>fields.some(f=>missingByMetric[f].includes(d))),reviewDivisions=divisions.filter(d=>fields.some(f=>reviewByMetric[f].includes(d)));
  const values=Object.fromEntries(fields.map(f=>[f,missingByMetric[f].length||reviewByMetric[f].length?null:rows.reduce((sum,r)=>sum+r[f],0)/divisions.length]));
  const qualityFields=Object.fromEntries(fields.filter(f=>reviewByMetric[f].length).map(f=>[f,'review']));
  if(values.winRate===0&&rows.every(r=>r.quality?.fields?.winRate==='verified'))qualityFields.winRate='verified';
  return {hero,...values,missingDivisions,reviewDivisions,missingByMetric,reviewByMetric,...(Object.keys(qualityFields).length?{quality:{fields:qualityFields}}:{})};
 });
}
