import {createHeroModel} from './heroModel.js';
import {RANK_POLICY_ID,rankDay} from './dailyRankModel.js';
import {RECOMMENDATION_POLICY} from '../domain/recommendationPolicy.js';
import {DEFAULT_META_POLICY} from '../domain/metaPolicies.js';
import {statisticsQuery,validateFilters} from './statisticsModel.js';
export const scorePolicyId=()=>[DEFAULT_META_POLICY.version,...Object.values(DEFAULT_META_POLICY.weights),Object.entries(DEFAULT_META_POLICY.roleWeights??{}).map(([role,weights])=>role+'='+Object.values(weights).join(',')).sort().join(';'),DEFAULT_META_POLICY.lowPickRate].join(':');
export const recommendationPolicyId=()=>['damage-s8-a8',DEFAULT_META_POLICY.version,'tank-support',RECOMMENDATION_POLICY.version,RECOMMENDATION_POLICY.sPickRate,RECOMMENDATION_POLICY.conditionalPickRate].join(':');
export const RANK_ROLES=['tank','damage','support'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const onlyKeys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
export const rankRoster=heroes=>Object.fromEntries(RANK_ROLES.map(role=>[role,heroes.filter(h=>h.role===role).map(h=>h.key).sort()]));
export function validateRankArchive(raw){
 if(raw?.schemaVersion!==1||!Array.isArray(raw.cohorts))throw Error('Invalid rank archive');
 if(Object.keys(raw).some(k=>!['schemaVersion','generatedAt','cohorts'].includes(k)))throw Error('Unexpected archive field');
 const seen=new Set();
 for(const row of raw.cohorts){
  if(Object.keys(row).some(k=>!['date','collectedAt','filters','policyId','metaPolicyId','recommendationPolicyId','roster','ranks','patch','statisticsWindow','comparison','cache'].includes(k)))throw Error('Unexpected rank field');
  if(!onlyKeys(row.filters,['platform','gamemode','map','region','division'])||!onlyKeys(row.roster,RANK_ROLES)||!onlyKeys(row.ranks,RANK_ROLES))throw Error('Unexpected nested rank field');
  if(row.comparison&&(!onlyKeys(row.comparison,['date','collectedAt','deltas'])||!onlyKeys(row.comparison.deltas,RANK_ROLES)))throw Error('Unexpected comparison field');
  if(row.cache&&(!Array.isArray(row.cache)||row.cache.some(c=>!onlyKeys(c,['division','collectedAt','ageSeconds']))))throw Error('Unexpected cache field');
  const key=statisticsQuery(validateFilters(row.filters));if(seen.has(key)||row.filters.map!=='all')throw Error('Duplicate/unsupported rank cohort');seen.add(key);
  if(!Number.isFinite(Date.parse(row.collectedAt))||rankDay(row.collectedAt)!==row.date||typeof row.policyId!=='string'||!row.metaPolicyId||!row.recommendationPolicyId)throw Error('Invalid rank metadata');
  const keys=RANK_ROLES.flatMap(role=>row.roster?.[role]??[]);if(!keys.length||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!/^[-a-z0-9]+$/.test(k)))throw Error('Invalid rank roster');
  for(const role of RANK_ROLES){const expected=row.roster[role],rank=row.ranks?.[role];if(!Array.isArray(expected)||!expected.length||rank!==null&&(!Array.isArray(rank)||!same([...rank].sort(),[...expected].sort())))throw Error('Invalid role ranks');
   if(row.comparison){const d=row.comparison.deltas?.[role];if(d!==null){if(!rank||!d||!same(Object.keys(d).sort(),[...rank].sort())||Object.values(d).some(v=>!Number.isInteger(v)||Math.abs(v)>=rank.length))throw Error('Invalid rank delta');
    const previousPositions=rank.map((key,i)=>i+1+d[key]).sort((a,b)=>a-b);if(!same(previousPositions,rank.map((_,i)=>i+1)))throw Error('Invalid previous rank positions');
   }}
  }
  if(row.comparison&&(rankDay(new Date(Date.parse(row.collectedAt)-86400000).toISOString())!==row.comparison.date||!Number.isFinite(Date.parse(row.comparison.collectedAt))||rankDay(row.comparison.collectedAt)!==row.comparison.date))throw Error('Invalid previous rank day');
 }
 return raw;
}
export function buildRankFrame({heroes,current,previous}){
 const filters=validateFilters(current.filters);if(filters.map!=='all'||current.stale||current.error||!Number.isFinite(Date.parse(current.fetchedAt)))throw Error('Unusable rank observation');
 if(current.records.length!==heroes.length||new Set(current.records.map(r=>r.hero)).size!==heroes.length||heroes.some(h=>!current.records.some(r=>r.hero===h.key)))throw Error('Incomplete hero cohort');
 const model=createHeroModel();Object.assign(model.state,{heroes,statistics:current,statsFilters:filters});
 const ranks={};for(const role of RANK_ROLES){model.state.role=role;const rows=model.sortedHeroes();ranks[role]=rows.length&&rows.every(h=>h.tier&&h.metaScore!=null)?rows.map(h=>h.key):null;}
 const row={date:rankDay(current.fetchedAt),collectedAt:current.fetchedAt,filters,policyId:RANK_POLICY_ID,metaPolicyId:scorePolicyId(),recommendationPolicyId:recommendationPolicyId(),roster:rankRoster(heroes),ranks,patch:current.patch??null,statisticsWindow:current.statisticsWindow??'unverified-patch-window',comparison:null};
 if(previous&&previous.date===rankDay(new Date(Date.parse(row.collectedAt)-86400000).toISOString())&&statisticsQuery(previous.filters)===statisticsQuery(filters)&&['policyId','metaPolicyId','recommendationPolicyId','roster','patch','statisticsWindow'].every(k=>same(row[k],previous[k]))){
  row.comparison={date:previous.date,collectedAt:previous.collectedAt,deltas:Object.fromEntries(RANK_ROLES.map(role=>[role,ranks[role]&&previous.ranks[role]?Object.fromEntries(ranks[role].map((key,i)=>[key,previous.ranks[role].indexOf(key)-i])):null]))};
 }
 // Cache ages are observations, never source aggregation timestamps.
 row.cache=(current.components??[current]).map(c=>({division:c.filters.division,collectedAt:c.fetchedAt,ageSeconds:c.providerAgeSeconds??null}));
 return row;
}
export function rankChangeDiagnostic({archive,heroes,filters,role,sorted,now=new Date().toISOString()}){
 if(!RANK_ROLES.includes(role))return 'role-all';
 if(!archive)return 'archive-unavailable';
 const row=archive.cohorts.find(r=>statisticsQuery(r.filters)===statisticsQuery(filters));
 if(!row)return archive.cohorts.length?'cohort-unavailable':'archive-empty';
 if(row.date!==rankDay(now))return 'reporting-day-mismatch';
 if(Date.parse(row.collectedAt)>Date.parse(now))return 'future-observation';
 if(row.policyId!==RANK_POLICY_ID||row.metaPolicyId!==scorePolicyId()||row.recommendationPolicyId!==recommendationPolicyId())return 'policy-mismatch';
 if(!same(row.roster,rankRoster(heroes)))return 'roster-mismatch';
 if(!row.comparison)return 'no-consecutive-baseline';
 if(!row.comparison.deltas[role])return 'incomplete-role-baseline';
 if(sorted.some(h=>!h.tier||h.metaScore==null))return 'unclassified-role';
 if(!same(sorted.map(h=>h.key).sort(),[...row.ranks[role]].sort()))return 'live-roster-mismatch';
 if(!same(sorted.map(h=>h.key),row.ranks[role]))return 'ready-stored-order';
 return 'ready';
}
export function storedRankChanges(input){
 if(!['ready','ready-stored-order'].includes(rankChangeDiagnostic(input)))return new Map();
 const {archive,filters,role,sorted}=input;
 const row=archive.cohorts.find(r=>statisticsQuery(r.filters)===statisticsQuery(filters));
 return new Map(sorted.map((h,i)=>{const currentRank=row.ranks[role].indexOf(h.key)+1,delta=row.comparison.deltas[role][h.key];return [h.key,{delta,currentRank,previousRank:currentRank+delta,liveRank:i+1,basis:'daily-observation',currentAt:row.collectedAt,previousAt:row.comparison.collectedAt}];}));
}
