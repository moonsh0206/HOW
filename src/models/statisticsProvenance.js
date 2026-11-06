import {divisionMembers,isCompositeDivision,statisticsQuery} from './statisticsModel.js';
export const DERIVATION_VERSION='how-equal-rank-v2';
export const OBSERVATION_TOLERANCE_MS=300000;
export function originalProvenance(filters){return {provider:'OverFast API',kind:'original',cohort:statisticsQuery(filters)};}
export function derivedProvenance(filters){return {provider:'OverFast API',kind:'derived',cohort:statisticsQuery(filters),version:DERIVATION_VERSION,members:divisionMembers(filters.division)};}
export function validatedProvenance(result){
 try{
  if(!['platform','gamemode','region','division','map'].every(k=>typeof result.filters?.[k]==='string'))return null;
  const composite=isCompositeDivision(result.filters.division),p=result.provenance;
  // Only original v1 records have a narrow legacy source-string fallback.
  if(!p)return !composite&&result.source==='OverFast API'?originalProvenance(result.filters):null;
  if(p.provider!=='OverFast API'||p.cohort!==statisticsQuery(result.filters)||p.kind!==(composite?'derived':'original'))return null;
  if(composite&&(p.version!==DERIVATION_VERSION||JSON.stringify(p.members)!==JSON.stringify(divisionMembers(result.filters.division))))return null;
  return p;
 }catch{return null;}
}
