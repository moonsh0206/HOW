import {t} from '../i18n/i18n.js';
import {RANK_ASSETS} from '../data/rankAssets.js';
import {node,image} from './dom.js';
const base=import.meta.env?.BASE_URL??'/';
const names={bronze:t("브론즈"),silver:t("실버"),gold:t("골드"),platinum:t("플래티넘"),emerald:t("에메랄드"),diamond:t("다이아몬드"),master:t("마스터"),grandmaster:t("그랜드마스터"),ultimate:t("챔피언"),champion:t("챔피언")};
export function playerRankImage(division){return ['ultimate','champion'].includes(division)?`${base}assets/ranks/champion.png`:RANK_ASSETS[division]?.assetUrl??null;}
export function renderPlayerRank(rank){
 const row=node('div',undefined,'player-rank');row.dataset.division=rank.division;
 const url=playerRankImage(rank.division);if(url)row.append(image(url));
 const text=node('span');text.append(node('strong',`${names[rank.division]??rank.division}${rank.tier!=null?' '+rank.tier:''}`),node('small',t("message.c5582ea41ae3",{"0":(rank.platform==='pc'?'PC':t("콘솔")),"1":(rank.season??t("정보 없음"))})));row.append(text);return row;
}
