import {t} from '../i18n/i18n.js';
import maps from '../data/standardMaps.json' with {type:'json'};
import {divisionName,DIVISION_GROUPS} from '../models/statisticsModel.js';
import {MAP_NAMES} from '../models/mapModel.js';
// UI order only. Unsupported divisions are never invented as API filters.
const order=['all','challenger','grandmaster','master_plus','master','diamond_plus','diamond','emerald_plus','emerald','platinum_plus','platinum','gold_plus','gold','silver_plus','silver','bronze_plus','bronze'];
export const RANK_OPTIONS=Object.freeze(order.filter(key=>DIVISION_GROUPS.some(g=>g.keys.includes(key))).map(value=>Object.freeze({value,label:divisionName(value)})));
export const MAP_MODE_LABELS=Object.freeze({push:t("밀기"),control:t("쟁탈"),escort:t("호위"),hybrid:t("하이브리드"),flashpoint:t("플래시포인트")});
export function mapDropdownOptions(available,selected='all'){
 const result=[{value:'all',label:t("전체 전장")}];
 for(const [mode,group] of Object.entries(MAP_MODE_LABELS)){
  const keys=new Set(maps.filter(m=>m.gamemodes.includes(mode)).map(m=>m.key));
  for(const map of available.filter(m=>keys.has(m.key)).sort((a,b)=>MAP_NAMES[a.key].localeCompare(MAP_NAMES[b.key],'ko')))result.push({value:map.key,label:MAP_NAMES[map.key],group});
 }
 if(selected!=='all'&&!result.some(o=>o.value===selected)&&MAP_NAMES[selected])result.push({value:selected,label:t("message.ad28257d7b47",{"0":(MAP_NAMES[selected])}),group:t("목록 검토 중")});
 return result;
}
