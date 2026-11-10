import * as fs from 'node:fs/promises';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {normalizeHeroes} from '../src/models/heroModel.js';
import {attachMetaTiers,META_POLICY} from '../src/domain/meta.js';
import {applyRecommendationPolicy,RECOMMENDATION_POLICY} from '../src/domain/recommendationPolicy.js';
import {statisticsUsable} from '../src/models/statisticsQuality.js';
const startedAt=new Date().toISOString(),dir=`docs/research/sierra-tiers/${startedAt.replace(/[:.]/g,'-')}`;
await fs.mkdir(dir,{recursive:true});
const requests=[];
async function capture(url,options){
 const startedAt=new Date().toISOString();const response=await fetch(url,{...options,cache:'no-cache'});
 const raw=await response.clone().text();const record={url,startedAt,receivedAt:new Date().toISOString(),status:response.status,headers:Object.fromEntries(response.headers),file:`response-${requests.length}.json`};requests.push(record);
 await fs.writeFile(`${dir}/${record.file}`,raw);await fs.writeFile(`${dir}/requests.json`,JSON.stringify(requests,null,2));return response;
}
try{
 const response=await capture('https://overfast-api.tekrop.fr/heroes?locale=ko-kr',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Roster HTTP ${response.status}`);
 const heroes=normalizeHeroes(await response.json()),service=createStatisticsService({fetcher:capture,timeoutMs:25000});
 const filters={platform:'pc',region:'asia',gamemode:'competitive',map:'all'};
 const components=await Promise.all(['diamond','master','grandmaster'].map(division=>service.getStatistics({...filters,division})));
 const composite=await service.getStatistics({...filters,division:'diamond_plus'});
 const frames=[...components,composite];
 const results=frames.map(frame=>{
  const baseline=attachMetaTiers(heroes,frame.records),ranked=baseline.map(applyRecommendationPolicy);
  const sierra=ranked.find(h=>h.key==='sierra');if(!sierra)throw Error('Sierra absent from actual roster');
  return {division:frame.filters.division,fetchedAt:frame.fetchedAt,observationStart:frame.observationStart,cached:frame.cached,stale:frame.stale,error:frame.error,providerAgeSeconds:frame.providerAgeSeconds,componentDivisions:frame.components?.map(c=>({division:c.filters.division,fetchedAt:c.fetchedAt,cached:c.cached,stale:c.stale,age:c.providerAgeSeconds,error:c.error})),sierra,damage:ranked.filter(h=>h.role==='damage').sort((a,b)=>(a.roleRank??Infinity)-(b.roleRank??Infinity)||a.key.localeCompare(b.key)),excluded:ranked.filter(h=>!statisticsUsable(h.statistics)).map(h=>h.key)};
 });
 const individuals=results.slice(0,3),combined=results[3];
 const promotions=combined.damage.filter(h=>h.tier==='S'&&individuals.every(f=>f.damage.find(p=>p.key===h.key)?.tier!=='S')).map(h=>({key:h.key,individuals:individuals.map(f=>f.damage.find(p=>p.key===h.key)?.tier),combined:h.tier}));
 const output={startedAt,completedAt:new Date().toISOString(),directory:dir,weights:META_POLICY,policy:RECOMMENDATION_POLICY,rosterCount:heroes.length,damageRosterCount:heroes.filter(h=>h.role==='damage').length,requests,results,promotions};
 await fs.writeFile(`${dir}/analysis.json`,JSON.stringify(output,null,2));
 console.log(JSON.stringify({directory:dir,requests:requests.map(r=>({url:r.url,status:r.status,age:r.headers.age,date:r.headers.date})),rosterCount:heroes.length,results:results.map(r=>({division:r.division,statistics:r.sierra.statistics,winPercentile:r.sierra.winPercentile,pickPercentile:r.sierra.pickPercentile,banPercentile:r.sierra.banPercentile,metaScore:r.sierra.metaScore,roleSize:r.sierra.roleSize,roleRank:r.sierra.roleRank,provisionalTier:r.sierra.provisionalTier,baselineTier:r.sierra.baselineTier,tier:r.sierra.tier,eligibility:r.sierra.eligibility,recommendationCapped:r.sierra.recommendationCapped,excluded:r.excluded})),promotions},null,2));
}catch(error){await fs.writeFile(`${dir}/failure.json`,JSON.stringify({error:error.message,requests},null,2));throw error;}
