import standardMaps from '../data/standardMaps.json' with { type: 'json' };
import names from '../data/mapNamesKo.json' with {type:'json'};
export const MAP_KEYS = new Set(standardMaps.map(map=>map.key));
export const MAP_NAMES = Object.freeze(Object.fromEntries(Object.entries(names).map(([key,row])=>[key,row.nameKo??`명칭 검토 중 (${key})`])));
const modes = new Set(['control','escort','hybrid','push','flashpoint']);
export function normalizeMaps(raw) {
  if(!Array.isArray(raw))throw new Error('맵 목록 형식이 올바르지 않습니다.');
  const seen=new Set();
  return raw.filter(map=>map&&MAP_KEYS.has(map.key)&&Array.isArray(map.uses)&&map.uses.includes('standard')&&Array.isArray(map.gamemodes)&&map.gamemodes.some(mode=>modes.has(mode))).map(map=>{
    if(seen.has(map.key)||typeof map.name!=='string'||!map.name.trim())throw new Error('맵 목록 검증에 실패했습니다.');
    seen.add(map.key);return {key:map.key,name:MAP_NAMES[map.key]??map.name};
  }).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
