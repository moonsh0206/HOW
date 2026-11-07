import mappings from '../data/perkMappings.json' with {type:'json'};
import {normalizeAllPerkStatistics,normalizePerkStatistics,PERK_MAPPING_VERSION,PERK_SOURCE_URL} from './perkSelectionModel.js';
export const PERK_API_URL='https://stats.overlooker.app/api/perks';
export const PERK_ARCHIVE_FILE='overlooker-perks.json';
export const PERK_ARCHIVE_FIELDS=Object.freeze(['providerPerkId','selectionFraction','selectionCount']);
const fraction=v=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
const count=v=>v===null||Number.isSafeInteger(v)&&v>=0;
const timestamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function filtersValid(f){return f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&Object.hasOwn(f,'queue_type')&&Object.hasOwn(f,'since')&&[null,'COMPETITIVE','QUICKPLAY'].includes(f.queue_type)&&(f.since===null||typeof f.since==='string');}
function active(ref,date){return (!ref.addedOn||ref.addedOn<=date)&&(!ref.removedOn||ref.removedOn>date);}
function completeKeys(actual,expected,label){const missing=expected.filter(k=>!actual.includes(k)),extra=actual.filter(k=>!expected.includes(k));if(missing.length||extra.length||actual.length!==expected.length)throw new Error(`${label} 불완전 · 누락: ${missing.join(', ')||'없음'} · 미등록: ${extra.join(', ')||'없음'} (${actual.length}/${expected.length})`);}
export function buildPerkArchive(raw,{collectedAt,responseDate=null,cacheControl=null,ageSeconds=null}={}){
 if(!timestamp(collectedAt)||!filtersValid(raw?.filters))throw new Error('특전 수집 시각/집계 조건 형식이 올바르지 않습니다.');
 const frames=normalizeAllPerkStatistics(raw),expected=Object.keys(mappings.heroes);
 completeKeys(frames.map(f=>f.heroKey),expected,'영웅 매핑');
 const heroes={};let perkCount=0;
 for(const frame of frames){
  const ref=mappings.heroes[frame.heroKey],original=raw.heroes.find(h=>h.hero===ref.providerHeroSlug);
  if(!count(original.sample_size))throw new Error(`${frame.heroKey}: 제공처 sample_size 오류`);
  completeKeys(original.perks.map(p=>`${p.tier}:${p.slug}`),ref.perks.map(p=>`${p.tier}:${p.providerPerkId}`),`${frame.heroKey} 특전 매핑`);
  const row={providerSampleSize:original.sample_size,minor:[],major:[]};
  for(const p of original.perks){const entry=frame.entries.find(e=>e.providerPerkId===p.slug),identity=ref.perks.find(r=>r.providerPerkId===p.slug);
   if(!entry?.perkKey||!identity||!active(identity,collectedAt.slice(0,10))||!fraction(p.pick_rate)||!count(p.picks))throw new Error(`${frame.heroKey}/${p.slug}: 매핑·활성 기간·수치 검증 실패`);
   row[p.tier].push([p.slug,p.pick_rate,p.picks]);perkCount++;
  }
  heroes[frame.heroKey]=row;
 }
 const archive={schemaVersion:1,source:'OverLooker',sourceUrl:PERK_SOURCE_URL,requestUrl:PERK_API_URL,collectedAt,mappingVersion:PERK_MAPPING_VERSION,filters:{...raw.filters},rateUnit:'fraction',fields:[...PERK_ARCHIVE_FIELDS],providerUpdatedAt:null,patch:null,window:null,stageDenominators:null,providerSampleUnit:null,responseDate,cacheControl,ageSeconds,heroCount:expected.length,perkCount,heroes};
 normalizePerkArchive(archive);return archive;
}
export function normalizePerkArchive(raw){
 if(!raw||raw.schemaVersion!==1||raw.source!=='OverLooker'||raw.sourceUrl!==PERK_SOURCE_URL||raw.requestUrl!==PERK_API_URL||raw.mappingVersion!==PERK_MAPPING_VERSION||!timestamp(raw.collectedAt)||!filtersValid(raw.filters)||raw.rateUnit!=='fraction'||JSON.stringify(raw.fields)!==JSON.stringify(PERK_ARCHIVE_FIELDS)||!raw.heroes||typeof raw.heroes!=='object'||Array.isArray(raw.heroes))throw new Error('저장된 특전 통계의 형식·매핑 버전을 확인해 주세요.');
 for(const field of ['providerUpdatedAt','patch','window','stageDenominators','providerSampleUnit'])if(raw[field]!==null)throw new Error(`미검증 특전 메타데이터: ${field}`);
 const keys=Object.keys(mappings.heroes);completeKeys(Object.keys(raw.heroes),keys,'저장 영웅');
 const frames=new Map();let total=0;
 for(const key of keys){const row=raw.heroes[key],ref=mappings.heroes[key];if(!row||!count(row.providerSampleSize))throw new Error(`${key}: 저장 표본 정보 오류`);
  const perks=[];
  for(const tier of ['minor','major']){if(!Array.isArray(row[tier]))throw new Error(`${key}: ${tier} 누락`);
   const ids=[];for(const tuple of row[tier]){if(!Array.isArray(tuple)||tuple.length!==3||!fraction(tuple[1])||!count(tuple[2]))throw new Error(`${key}: 저장 특전 수치 오류`);
    const identity=ref.perks.find(r=>r.providerPerkId===tuple[0]&&r.tier===tier);if(!identity||!active(identity,raw.collectedAt.slice(0,10)))throw new Error(`${key}/${tuple[0]}: 특전 ID·단계·활성 기간 오류`);
    ids.push(tuple[0]);perks.push({slug:tuple[0],name:identity.providerName,tier,slot:identity.slot,pick_rate:tuple[1],picks:tuple[2]});
   }
   completeKeys(ids,ref.perks.filter(r=>r.tier===tier).map(r=>r.providerPerkId),`${key}/${tier}`);
  }
  const frame=normalizePerkStatistics({hero:ref.providerHeroSlug,hero_name:ref.providerName,role:ref.role,sample_size:row.providerSampleSize,filters:raw.filters,perks},key);
  frames.set(key,{...frame,storage:'same-origin-json',collectedAt:raw.collectedAt,providerUpdatedAt:null,fetchedAt:null});total+=perks.length;
 }
 if(raw.heroCount!==keys.length||raw.perkCount!==total)throw new Error('저장 특전 개수 메타데이터 불일치');
 return {collectedAt:raw.collectedAt,frames};
}
