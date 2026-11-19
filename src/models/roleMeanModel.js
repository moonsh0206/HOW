import {rateStatus,statisticsNeedsReview} from './statisticsQuality.js';
import {statisticsQuery} from './statisticsModel.js';
export const ROLE_MEAN_VERSION='how-role-hero-mean-v1';
export const ROLE_MEAN_METHOD='equal-hero-weight-complete-roster';
export const MEAN_ROLES=Object.freeze(['tank','damage','support']);
export function roleRoster(heroes){return Object.fromEntries(MEAN_ROLES.map(role=>[role,heroes.filter(h=>h.role===role).map(h=>h.key).sort()]));}
export function meanRoleRecords(records,heroes){
 const roster=roleRoster(heroes),byKey=new Map(records.map(r=>[r.hero,r]));
 return Object.fromEntries(MEAN_ROLES.map(role=>{const target=roster[role],valid=target.filter(key=>{const row=byKey.get(key);return !statisticsNeedsReview(row)&&rateStatus(row,'winRate')==='available';});
  return [role,{value:target.length&&valid.length===target.length?valid.reduce((sum,key)=>sum+byKey.get(key).winRate,0)/valid.length:null,count:valid.length,targetCount:target.length,excludedCount:target.length-valid.length}];
 }));
}
export function normalizeRoleMeanArchive(raw){
 if(raw?.schemaVersion!==1||raw.aggregateVersion!==ROLE_MEAN_VERSION||raw.method!==ROLE_MEAN_METHOD||raw.metric!=='winRate'||!raw.roster||!Array.isArray(raw.observations)||!Number.isFinite(Date.parse(raw.generatedAt))||!/^[a-f0-9]{64}$/.test(raw.sourceFingerprint))throw Error('Invalid role mean archive');
 const seenRoster=new Set();for(const role of MEAN_ROLES){if(!Array.isArray(raw.roster[role])||!raw.roster[role].length)throw Error('Invalid role roster');for(const key of raw.roster[role]){if(!/^[a-z0-9-]+$/.test(key)||seenRoster.has(key))throw Error('Invalid role member');seenRoster.add(key);}}
 const seen=new Set();for(const row of raw.observations){const key=statisticsQuery(row.filters)+':'+row.collectedAt;if(seen.has(key)||!Number.isFinite(Date.parse(row.collectedAt))||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Array.isArray(row.sources)||!row.sources.length)throw Error('Invalid role observation');seen.add(key);
  if(row.date!==new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.collectedAt)))throw Error('Role observation KST date mismatch');
  for(const s of row.sources)if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(s.file)||!Number.isFinite(Date.parse(s.collectedAt))||!s.sha256||!/^[a-f0-9]{64}$/.test(s.sha256))throw Error('Invalid role source');
  for(const role of MEAN_ROLES){const r=row.roles?.[role],n=raw.roster[role].length;if(!r||r.targetCount!==n||!Number.isInteger(r.count)||r.count<0||r.count>n||r.excludedCount!==n-r.count||r.count!==n&&r.value!==null||r.value!==null&&(!Number.isFinite(r.value)||r.value<0||r.value>100)||r.count===n&&r.value===null)throw Error('Invalid role mean');}
  if(row.coverage?.validCount!==MEAN_ROLES.reduce((n,role)=>n+row.roles[role].count,0)||row.coverage?.targetCount!==MEAN_ROLES.reduce((n,role)=>n+row.roles[role].targetCount,0))throw Error('Invalid total role coverage');
 }
 return raw;
}
