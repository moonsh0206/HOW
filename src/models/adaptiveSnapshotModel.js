import {statisticsQuery} from './statisticsModel.js';
import {isObservationTime} from './snapshotModel.js';
import {rateStatus} from './statisticsQuality.js';
const DAY=86400000;
export const ADAPTIVE_POLICY=Object.freeze({days:[1,3,7,14],weeklyDays:7,maxAttemptsPerDay:2,maxExtraPer72Hours:1,requestsPerRegion:9,maxRequestsPerRun:27,minIntervalMs:DAY});
const time=x=>isObservationTime(x)?Date.parse(x):NaN;
// Scheduling labels never constitute proof of the provider's aggregation window.
export function adaptiveCollectionDecision({patch,observations=[],attempts=[],now=Date.now(),extraRequested=false,policy=ADAPTIVE_POLICY}){
 if(!Number.isFinite(now))throw new Error('Invalid clock');
 const start=time(patch?.effectiveAt);
 if(!Number.isFinite(start)||!['balance','hotfix','hero-hotfix'].includes(patch.type))return {collect:false,reason:'unverified-effective-time',patchVerified:false};
 if(now<start)return {collect:false,reason:'before-effective-time',patchVerified:false};
 const recent=attempts.filter(a=>Number.isFinite(time(a.at))&&now-time(a.at)>=0&&now-time(a.at)<DAY);
 if(recent.length>=policy.maxAttemptsPerDay)return {collect:false,reason:'attempt-budget',patchVerified:false};
 const same=observations.filter(o=>o.targetPatch===patch.id&&Number.isFinite(time(o.collectedAt))&&time(o.collectedAt)<=now);
 const latest=Math.max(-Infinity,...same.map(o=>time(o.collectedAt)));
 if(now-latest<policy.minIntervalMs)return {collect:false,reason:'observation-cooldown',patchVerified:false};
 const elapsed=Math.floor((now-start)/DAY),targets=[...policy.days];
 for(let day=21;day<=elapsed;day+=policy.weeklyDays)targets.push(day);
 // Expired milestones are not backfilled with today's data; only the current interval is eligible.
 const due=targets.filter(d=>d<=elapsed).at(-1);
 if(due!==undefined&&!same.some(o=>o.milestone===`D+${due}`))return {collect:true,reason:'milestone',milestone:`D+${due}`,targetPatch:patch.id,patchVerified:false};
 if(extraRequested&&elapsed>=1&&elapsed<3&&same.filter(o=>o.milestone==='extra-72h').length<policy.maxExtraPer72Hours)return {collect:true,reason:'operator-reviewed-change-alert',milestone:'extra-72h',targetPatch:patch.id,patchVerified:false};
 return {collect:false,reason:'no-observation-due',patchVerified:false};
}
// Descriptive %p changes only. No default significance threshold or invented sample size.
export function describeObservationChanges(previous,current){
 if(statisticsQuery(previous.filters)!==statisticsQuery(current.filters))throw new Error('Mixed cohort');
 const before=new Map(previous.records.map(r=>[r.hero,r]));
 return current.records.flatMap(r=>['winRate','pickRate','banRate'].flatMap(metric=>{
  const old=before.get(r.hero);return rateStatus(old,metric)==='available'&&rateStatus(r,metric)==='available'?[{hero:r.hero,metric,delta:r[metric]-old[metric]}]:[];
 })).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.hero.localeCompare(b.hero,'en'));
}
