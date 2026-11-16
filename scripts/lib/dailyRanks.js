import {DIVISIONS,REGIONS,divisionMembers,statisticsQuery} from '../../src/models/statisticsModel.js';
import {DERIVED_DIVISIONS} from '../../src/models/snapshotV2Model.js';
import {combineDivisionStatistics} from '../../src/models/compositeStatisticsModel.js';
import {derivedProvenance,OBSERVATION_TOLERANCE_MS} from '../../src/models/statisticsProvenance.js';
import {rankDay,RANK_POLICY_ID} from '../../src/models/dailyRankModel.js';
import {buildRankFrame,validateRankArchive,rankRoster,scorePolicyId,recommendationPolicyId} from '../../src/models/rankArchiveModel.js';
export async function collectDailyRanks({service,heroes,previous,now=Date.now}){
 validateRankArchive(previous);const cohorts=new Map(previous.cohorts.map(r=>[statisticsQuery(r.filters),r])),failures=[];let requests=0,updated=0;
 const alreadyCollected=row=>row?.date===rankDay(new Date(now()).toISOString())&&row.policyId===RANK_POLICY_ID&&row.metaPolicyId===scorePolicyId()&&row.recommendationPolicyId===recommendationPolicyId()&&JSON.stringify(row.roster)===JSON.stringify(rankRoster(heroes));
 for(const region of Object.keys(REGIONS)){
  const base={platform:'pc',gamemode:'competitive',map:'all',region};
  const divisions=[...Object.keys(DIVISIONS),...DERIVED_DIVISIONS];
  if(divisions.every(division=>alreadyCollected(cohorts.get(statisticsQuery({...base,division})))))continue;
  const originals=new Map();
  for(const division of Object.keys(DIVISIONS)){
   try{requests++;const frame=await service.getStatistics({...base,division});if(statisticsQuery(frame.filters)!==statisticsQuery({...base,division})||frame.stale||frame.error)throw Error('Unusable original');originals.set(division,frame);}catch(error){failures.push({region,division,error:error.message});}
  }
  for(const division of divisions){const filters={...base,division},key=statisticsQuery(filters),old=cohorts.get(key);if(alreadyCollected(old))continue;
   try{
    let current=originals.get(division);
    if(!current&&DERIVED_DIVISIONS.includes(division)){
     const components=divisionMembers(division).map(d=>originals.get(d));if(components.some(c=>!c))throw Error('Missing original divisions');
     const times=components.map(c=>Date.parse(c.fetchedAt));if(Math.max(...times)-Math.min(...times)>OBSERVATION_TOLERANCE_MS||new Set(components.map(c=>rankDay(c.fetchedAt))).size!==1||new Set(components.map(c=>c.patch??null)).size!==1||new Set(components.map(c=>c.statisticsWindow??'unverified-patch-window')).size!==1)throw Error('Incompatible component observations');
     current={filters,records:combineDivisionStatistics(filters,components),components,fetchedAt:new Date(Math.max(...times)).toISOString(),patch:components[0].patch??null,statisticsWindow:components[0].statisticsWindow,provenance:derivedProvenance(filters)};
    }
    if(!current)throw Error('Original request failed');
    if(rankDay(current.fetchedAt)!==rankDay(new Date(now()).toISOString()))throw Error('Observation outside current reporting day');
    const row=buildRankFrame({heroes,current,previous:old});if(Object.values(row.ranks).every(r=>r===null))throw Error('No fully classified role');cohorts.set(key,row);updated++;
   }catch(error){failures.push({region,division,error:error.message});}
  }
 }
 const archive=validateRankArchive({schemaVersion:1,generatedAt:new Date(now()).toISOString(),cohorts:[...cohorts.values()]});return {archive,requests,updated,failures};
}
