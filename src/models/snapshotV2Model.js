import {normalizeSnapshot,isObservationTime} from './snapshotModel.js';
import {DIVISIONS} from './statisticsModel.js';
export const SNAPSHOT_FIELDS=Object.freeze(['winRate','pickRate','banRate']);
// Expand original divisions on read. Composite ranks are never serialized.
export function expandSnapshotFile(raw){
 if(raw?.schemaVersion===1)return [normalizeSnapshot(raw)];
 if(raw?.schemaVersion!==2||raw.source!=='OverFast API'||JSON.stringify(raw.fields)!==JSON.stringify(SNAPSHOT_FIELDS)||!Array.isArray(raw.heroes)||new Set(raw.heroes).size!==raw.heroes.length||!raw.heroes.every(k=>typeof k==='string'&&/^[a-z0-9-]+$/.test(k))||!raw.heroes.length||!raw.divisions||typeof raw.divisions!=='object')throw new Error('잘못된 v2 스냅샷 구조');
 return Object.entries(raw.divisions).flatMap(([division,data])=>{
  if(!Object.hasOwn(DIVISIONS,division))throw new Error('원본 개별 등급만 저장할 수 있습니다.');
  if(data.status==='error'||data.status==='uncollected'){if(data.records!=null)throw new Error('미수집 등급에 통계가 있습니다.');return [];}
  if(data.status!=='ok'||!isObservationTime(data.collectedAt)||!Array.isArray(data.records)||data.records.length!==raw.heroes.length||data.records.some(r=>!Array.isArray(r)||r.length!==3))throw new Error('v2 등급 배열 또는 관측 시각 오류');
  return [normalizeSnapshot({schemaVersion:1,source:raw.source,filters:{platform:raw.platform,gamemode:raw.gamemode,region:raw.region,map:raw.map,division},batchId:raw.batchId,collectedAt:data.collectedAt,aggregateAt:null,cacheAgeSeconds:data.cacheAgeSeconds,requestUrl:data.requestUrl,patch:data.patch,patchVerification:data.patchVerification,statisticsWindow:data.statisticsWindow,records:data.records.map((r,i)=>({hero:raw.heroes[i],winrate:r[0],pickrate:r[1],banrate:r[2]}))})];
 });
}
