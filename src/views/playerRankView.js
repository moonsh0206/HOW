import {RANK_ASSETS} from '../data/rankAssets.js';
import {node,image} from './dom.js';
const base=import.meta.env?.BASE_URL??'/';
const names={bronze:'브론즈',silver:'실버',gold:'골드',platinum:'플래티넘',emerald:'에메랄드',diamond:'다이아몬드',master:'마스터',grandmaster:'그랜드마스터',ultimate:'챔피언',champion:'챔피언'};
export function playerRankImage(division){return ['ultimate','champion'].includes(division)?`${base}assets/ranks/champion.png`:RANK_ASSETS[division]?.assetUrl??null;}
export function renderPlayerRank(rank){
 const row=node('div',undefined,'player-rank');row.dataset.division=rank.division;
 const url=playerRankImage(rank.division);if(url)row.append(image(url));
 const text=node('span');text.append(node('strong',`${names[rank.division]??rank.division}${rank.tier!=null?' '+rank.tier:''}`),node('small',`${rank.platform==='pc'?'PC':'콘솔'} · 시즌 ${rank.season??'정보 없음'}`));row.append(text);return row;
}
