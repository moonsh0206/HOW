import mappings from '../data/perkMappings.json' with {type:'json'};
export const PERK_SOURCE_URL='https://overlooker.app/stats/perks';
export const PERK_MAPPING_VERSION=mappings.version;
export function perkHeroMapping(key){return Object.hasOwn(mappings.heroes,key)?mappings.heroes[key]:null;}
export function unavailablePerkSelection(heroKey){
 return {heroKey,status:'unavailable',source:'OverLooker',sourceUrl:PERK_SOURCE_URL,permission:'user-confirmed-provider-approval',mappingVersion:PERK_MAPPING_VERSION,patch:null,window:null,filters:null,sample:{unit:null,minor:null,major:null},fetchedAt:null,entries:[]};
}
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const rate=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?value*100:null;
export function normalizePerkStatistics(raw,heroKey,{fetchedAt=null}={}){
 const mapping=perkHeroMapping(heroKey);
 if(!mapping||!raw||raw.hero!==mapping.providerHeroSlug||raw.hero_name!==mapping.providerName||raw.role!==mapping.role||!Array.isArray(raw.perks)||!raw.filters||typeof raw.filters!=='object'||Array.isArray(raw.filters))throw new Error('특전 통계 응답 또는 영웅 식별자가 올바르지 않습니다.');
 const seen=new Set();
 const entries=raw.perks.map(p=>{
  if(!p||typeof p.slug!=='string'||!/^[a-z0-9_]+$/.test(p.slug)||seen.has(p.slug)||!['minor','major'].includes(p.tier))throw new Error('특전 식별자·단계가 올바르지 않습니다.');
  seen.add(p.slug);
  const ref=mapping.perks.find(r=>r.providerPerkId===p.slug&&r.tier===p.tier&&r.providerName===p.name&&r.slot===p.slot);
  const selectionRate=rate(p.pick_rate),selectionCount=count(p.picks);
  return {heroKey,providerHeroSlug:raw.hero,providerPerkId:p.slug,perkKey:ref?.perkKey??null,tier:p.tier,selectionRate,selectionCount,sampleSize:null,observedAt:null,filters:{...raw.filters},source:'OverLooker',status:!ref?'mapping-review':selectionRate===null?'unavailable':'ready'};
 });
 return {...unavailablePerkSelection(heroKey),status:'ready',providerHeroSlug:raw.hero,providerSampleSize:count(raw.sample_size),providerSampleUnit:null,filters:{...raw.filters},fetchedAt,entries};
}
export function normalizeAllPerkStatistics(raw,options){
 if(!raw||!Array.isArray(raw.heroes)||!raw.filters)throw new Error('전체 특전 통계 응답이 올바르지 않습니다.');
 const seen=new Set();return raw.heroes.map(row=>{const pair=Object.entries(mappings.heroes).find(([,m])=>m.providerHeroSlug===row.hero);if(!pair||seen.has(row.hero))throw new Error('전체 특전 통계 영웅 매핑을 확인해 주세요.');seen.add(row.hero);return normalizePerkStatistics({...row,filters:raw.filters},pair[0],options);});
}
// Exact versioned identity; no runtime order or fuzzy-text joins.
export function perkSelectionForItem(heroKey,tier,item,result,{date=new Date().toISOString().slice(0,10)}={}){
 const mapping=perkHeroMapping(heroKey);
 const refs=mapping?.perks.filter(r=>r.tier===tier&&(r.nameKo===item.name||r.providerName===item.name)&&r.icon===item.icon)??[];
 if(refs.length!==1)return {status:'mapping-review',selectionRate:null,selectionCount:null};
 const ref=refs[0];
 if(ref.addedOn&&date<ref.addedOn||ref.removedOn&&date>=ref.removedOn)return {status:'inactive',selectionRate:null,selectionCount:null};
 if(result?.heroKey!==heroKey)return {status:'unavailable',selectionRate:null,selectionCount:null};
 return result.entries.find(e=>e.perkKey===ref.perkKey&&e.tier===tier)??{status:'unavailable',selectionRate:null,selectionCount:null};
}
// Combine immutable OverFast descriptions with verified provider identities in Model.
// The View receives selected entries; it never guesses IDs from names or array order.
export function perkCardsForDetail(heroKey,detail,state){
 return Object.fromEntries(['minor','major'].map(tier=>[tier,(detail[tier]??[]).map(item=>({...item,selection:state.status==='ready'?perkSelectionForItem(heroKey,tier,item,state.result):null}))]));
}
