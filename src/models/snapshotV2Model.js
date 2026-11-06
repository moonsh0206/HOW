import {normalizeSnapshot,isObservationTime} from './snapshotModel.js';
import {DIVISIONS,divisionMembers,statisticsQuery} from './statisticsModel.js';
import {qualitySummary} from './statisticsQuality.js';
import {combineDivisionHistory} from './compositeHistoryModel.js';
import {DERIVATION_VERSION} from './statisticsProvenance.js';
export const SNAPSHOT_FIELDS=Object.freeze(['winRate','pickRate','banRate']);
export const DERIVED_DIVISIONS=Object.freeze(['bronze_plus','silver_plus','gold_plus','platinum_plus','emerald_plus','diamond_plus','master_plus']);
export function stableJSON(value){const clean=JSON.parse(JSON.stringify(value));const encode=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(encode).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+encode(x[k])).join(',')+'}';return encode(clean);}
function fingerprint(raw){const {fields,heroes,platform,gamemode,region,map,batchId,observationDate,divisions}=raw;let hash=2166136261;for(const char of stableJSON({fields,heroes,platform,gamemode,region,map,batchId,observationDate,divisions})){hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;}return hash.toString(16).padStart(8,'0');}
function originals(raw){
 if(raw?.schemaVersion!==2||raw.source!=='OverFast API'||JSON.stringify(raw.fields)!==JSON.stringify(SNAPSHOT_FIELDS)||!Array.isArray(raw.heroes)||new Set(raw.heroes).size!==raw.heroes.length||!raw.heroes.every(k=>typeof k==='string'&&/^[a-z0-9-]+$/.test(k))||!raw.heroes.length||!raw.divisions||typeof raw.divisions!=='object')throw new Error('Invalid v2 structure');
 if(raw.observationDate!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(raw.observationDate)||new Date(`${raw.observationDate}T00:00:00Z`).toISOString().slice(0,10)!==raw.observationDate))throw new Error('Invalid batch observation date');
 if(raw.batchId!==undefined&&(typeof raw.batchId!=='string'||!raw.batchId||raw.batchId.length>200))throw new Error('Invalid batch ID');
 if(raw.collection){const failed=Object.keys(DIVISIONS).filter(d=>raw.divisions[d]?.status!=='ok'),succeeded=9-failed.length,status=succeeded===9?'complete':succeeded?'partial':'failed';if(raw.collection.expected!==9||raw.collection.succeeded!==succeeded||raw.collection.status!==status||!Array.isArray(raw.collection.failedDivisions)||stableJSON(raw.collection.failedDivisions)!==stableJSON(failed))throw new Error('Collection result metadata mismatch');}
 return Object.entries(raw.divisions).flatMap(([division,data])=>{
  if(!Object.hasOwn(DIVISIONS,division)||!data)throw new Error('Invalid original division');
  if(data.status==='error'||data.status==='uncollected'){if(data.records!=null)throw new Error('Uncollected division has records');return [];}
  if(data.status!=='ok'||!isObservationTime(data.collectedAt)||!Array.isArray(data.records)||data.records.length!==raw.heroes.length||data.records.some(r=>!Array.isArray(r)||r.length!==3))throw new Error('Invalid division arrays or observation time');
  const result=normalizeSnapshot({schemaVersion:1,source:raw.source,filters:{platform:raw.platform,gamemode:raw.gamemode,region:raw.region,map:raw.map,division},batchId:raw.batchId,observationDate:raw.observationDate,derivationVersion:raw.derivationVersion,collectedAt:data.collectedAt,aggregateAt:null,cacheAgeSeconds:data.cacheAgeSeconds,requestUrl:data.requestUrl,patch:data.patch,patchVerification:data.patchVerification,statisticsWindow:data.statisticsWindow,records:data.records.map((r,i)=>({hero:raw.heroes[i],winrate:r[0],pickrate:r[1],banrate:r[2]}))});
  if(data.dataQuality){
   if(!Array.isArray(data.dataQuality)||data.dataQuality.length!==result.records.length)throw new Error('Original quality metadata length mismatch');
   result.records=result.records.map((row,i)=>{
    const q=data.dataQuality[i];if(stableJSON(q)!==stableJSON(row.quality??null)){
     if(!q||q.source!=='blizzard'||!q.fields||Object.entries(q.fields).some(([f,s])=>!SNAPSHOT_FIELDS.includes(f)||!(s==='verified'&&row[f]===0||s==='confirmed-missing'&&row[f]===null&&q.rawValues?.[f]===-1))||Object.entries(q.rawValues??{}).some(([f,v])=>v!==-1||q.fields[f]!=='confirmed-missing'))throw new Error('Original quality metadata mismatch');
     return Object.freeze({...row,quality:Object.freeze({...q,fields:Object.freeze({...q.fields}),rawValues:Object.freeze({...q.rawValues})})});
    }return row;
   });
  }
  if(data.qualitySummary&&stableJSON(data.qualitySummary)!==stableJSON(qualitySummary(result.records)))throw new Error('Original quality summary mismatch');
  return [result];
 });
}
export function buildV2Derived(raw,records=originals(raw)){
 const derived={},frames=[],inputFingerprint=fingerprint(raw);
 for(const division of DERIVED_DIVISIONS){
  const filters={platform:raw.platform,gamemode:raw.gamemode,region:raw.region,map:raw.map,division},members=divisionMembers(division);
  const frame=combineDivisionHistory(records,filters)[0];
  const base={calculationVersion:DERIVATION_VERSION,members,batchId:raw.batchId??null,region:raw.region,observationDate:raw.observationDate??null,cohort:statisticsQuery(filters),inputFingerprint};
  if(!frame){derived[division]={...base,status:'unavailable',missingDivisions:members.filter(d=>!records.some(r=>r.filters.division===d)),reason:'incomplete-or-incompatible-original-batch'};continue;}
  frames.push(frame);
  derived[division]={...base,status:frame.records.some(r=>SNAPSHOT_FIELDS.some(f=>r[f]===null))?'partial':'ok',collectedAt:frame.collectedAt,observationStart:frame.observationStart,patch:frame.patch,patchVerification:frame.patchVerification,statisticsWindow:frame.statisticsWindow,provenance:frame.provenance,qualitySummary:qualitySummary(frame.records),records:raw.heroes.map(key=>{const row=frame.records.find(r=>r.hero===key);return SNAPSHOT_FIELDS.map(f=>row?.[f]??null);}),dataQuality:raw.heroes.map(key=>{const r=frame.records.find(r=>r.hero===key);return r&&!r.missingDivisions.length&&!r.reviewDivisions.length&&!r.quality?null:{missingByMetric:r?.missingByMetric??{},reviewByMetric:r?.reviewByMetric??{},quality:r?.quality??null};})};
 }
 return {derived,frames};
}
// Recompute and compare all derived values, not just a checksum. v1 remains immutable.
export function expandSnapshotFile(raw,{includeDerived=false}={}){
 if(raw?.schemaVersion===1)return [normalizeSnapshot(raw)];
 const records=originals(raw),computed=buildV2Derived(raw,records);
 if(raw.derived!==undefined&&stableJSON(raw.derived)!==stableJSON(computed.derived))throw new Error('Derived/original integrity mismatch');
 return includeDerived?[...records,...computed.frames]:records;
}
