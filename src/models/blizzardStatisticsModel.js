import {normalizeStatistics,validateFilters} from './statisticsModel.js';
// Explicit adapter for an actually obtained original payload, not an automatic extra fetch.
export function normalizeBlizzardStatistics(payload,filters,{gamemodeKey}={}){
 const f=validateFilters(filters),selected=payload?.rates?.selected;
 const capital=value=>value[0].toUpperCase()+value.slice(1);
 if(typeof gamemodeKey!=='string'||!selected||selected.input!=='PC'||selected.rq!==gamemodeKey||selected.region!==capital(f.region)||selected.map!==(f.map==='all'?'all-maps':f.map)||(f.gamemode==='competitive'&&selected.tier!==capital(f.division)))throw new Error('블리자드 원본 조회 조건이 일치하지 않습니다.');
 if(!Array.isArray(payload.rates.rates))throw new Error('블리자드 원본 구조가 올바르지 않습니다.');
 return normalizeStatistics(payload.rates.rates.map(r=>({hero:r.id,winrate:r.cells?.winrate,pickrate:r.cells?.pickrate,banrate:f.gamemode==='competitive'?r.cells?.banrate:null})),{source:'blizzard'});
}
