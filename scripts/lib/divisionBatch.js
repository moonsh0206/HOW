import roster from '../../src/data/subroles.json' with {type:'json'};
import {RANK_POLICY_ID} from '../../src/models/dailyRankModel.js';
import {DIVISIONS,REGIONS,statisticsQuery} from '../../src/models/statisticsModel.js';
import {SNAPSHOT_FIELDS,expandSnapshotFile,buildV2Derived} from '../../src/models/snapshotV2Model.js';
import {qualitySummary} from '../../src/models/statisticsQuality.js';
import {DERIVATION_VERSION} from '../../src/models/statisticsProvenance.js';
// Caller chooses whether to persist. No synthetic or combined rank goes into the file.
export async function collectDivisionBatch({service,region='asia',heroKeys,now=Date.now}){
 if(!Object.hasOwn(REGIONS,region)||!Array.isArray(heroKeys)||new Set(heroKeys).size!==heroKeys.length)throw new Error('Invalid batch condition');
 const started=new Date(now()).toISOString(),divisions={};
 for(const division of Object.keys(DIVISIONS)){
  const filters={platform:'pc',gamemode:'competitive',region,division,map:'all'};
  try{
   const result=await service.getStatistics(filters);
   if(result.stale||statisticsQuery(result.filters)!==statisticsQuery(filters)||result.records.length!==heroKeys.length)throw new Error('Incomplete, stale or mismatched original division');
   const records=heroKeys.map(key=>{const row=result.records.find(r=>r.hero===key);if(!row)throw new Error('Missing hero');return SNAPSHOT_FIELDS.map(field=>row[field]);});
   divisions[division]={status:'ok',collectedAt:result.fetchedAt,cacheAgeSeconds:result.providerAgeSeconds??null,browserCached:result.cached===true,requestUrl:`https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(filters)}`,patch:null,patchVerification:{status:'unverified'},statisticsWindow:'unverified-patch-window',records,dataQuality:heroKeys.map(key=>result.records.find(r=>r.hero===key).quality??null),qualitySummary:qualitySummary(result.records)};
  }catch(error){divisions[division]={status:'error',attemptedAt:new Date(now()).toISOString(),records:null,error:error.message};}
 }
 const raw={rankPolicyId:RANK_POLICY_ID,rankRoster:Object.fromEntries(heroKeys.map(key=>[key,roster.heroes[key]?.parentRole])),schemaVersion:2,source:'OverFast API',platform:'pc',gamemode:'competitive',region,map:'all',observationDate:started.slice(0,10),batchId:`${region}:${started}`,fields:SNAPSHOT_FIELDS,heroes:heroKeys,divisions};
 raw.derivationVersion=DERIVATION_VERSION;
 const failedDivisions=Object.keys(divisions).filter(d=>divisions[d].status!=='ok');
 raw.collection={status:failedDivisions.length===9?'failed':failedDivisions.length?'partial':'complete',succeeded:9-failedDivisions.length,expected:9,failedDivisions};
 raw.derived=buildV2Derived(raw).derived;
 expandSnapshotFile(raw);return raw;
}
