import {DIVISIONS,REGIONS,statisticsQuery} from '../../src/models/statisticsModel.js';
import {SNAPSHOT_FIELDS,expandSnapshotFile} from '../../src/models/snapshotV2Model.js';
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
   divisions[division]={status:'ok',collectedAt:result.fetchedAt,cacheAgeSeconds:result.providerAgeSeconds,requestUrl:`https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(filters)}`,patch:null,patchVerification:{status:'unverified'},statisticsWindow:'unverified-patch-window',records};
  }catch(error){divisions[division]={status:'error',records:null,error:error.message};}
 }
 const raw={schemaVersion:2,source:'OverFast API',platform:'pc',gamemode:'competitive',region,map:'all',observationDate:started.slice(0,10),batchId:`${region}:${started}`,fields:SNAPSHOT_FIELDS,heroes:heroKeys,divisions};
 expandSnapshotFile(raw);return raw;
}
