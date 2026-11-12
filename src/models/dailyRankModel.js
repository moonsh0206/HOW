import {createHeroModel} from './heroModel.js';
import {statisticsQuery} from './statisticsModel.js';
import {META_POLICY} from '../domain/meta.js';
import {RECOMMENDATION_POLICY} from '../domain/recommendationPolicy.js';

// Bump whenever scoring, eligibility, roster classification or tie policy changes.
export const RANK_POLICY_ID = 'meta-v2-65-25-10__recommendation-v2.1__ties-name-key-v1';
export function rankDay(time) {
  // A reporting day starts at 10:00 KST (01:00 UTC), not at midnight.
  return new Date(Date.parse(time)-3600000).toISOString().slice(0,10);
}
export function dailyRankChanges({snapshots,heroes,filters,role,now=new Date().toISOString()}) {
  const empty=new Map();
  if(!['tank','damage','support'].includes(role))return empty;
  const today=rankDay(now),yesterday=rankDay(new Date(Date.parse(now)-86400000).toISOString());
  const matching=snapshots.filter(s=>s.rankPolicyId===RANK_POLICY_ID&&statisticsQuery(s.filters)===statisticsQuery(filters)&&Date.parse(s.collectedAt)<=Date.parse(now));
  // First successful observation after the daily cutoff; never replace it with a later peak.
  const choose=day=>matching.filter(s=>rankDay(s.collectedAt)===day).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt))[0];
  const current=choose(today),previous=choose(yesterday);
  if(!current||!previous||current.patch!==previous.patch||current.statisticsWindow!==previous.statisticsWindow)return empty;
  const rank=s=>{const model=createHeroModel([],{metaPolicy:META_POLICY});Object.assign(model.state,{heroes,statistics:{filters,records:s.records},statsFilters:filters,role});return model.sortedHeroes();};
  const a=rank(current),b=rank(previous);
  if(!a.length||a.some(h=>!h.tier||h.metaScore==null)||b.some(h=>!h.tier||h.metaScore==null)||a.length!==b.length||a.some(h=>!b.some(old=>old.key===h.key)))return empty;
  // Roster identities AND roles must agree in both persisted observations.
  if([current,previous].some(s=>!s.rankRoster||a.some(h=>s.rankRoster[h.key]!==h.role)))return empty;
  return new Map(a.map((hero,index)=>[hero.key,{delta:b.findIndex(h=>h.key===hero.key)-index,currentRank:index+1,currentAt:current.collectedAt,previousAt:previous.collectedAt,policy:RECOMMENDATION_POLICY.version}]));
}
