import {t} from '../i18n/i18n.js';
import {safeImage} from './heroModel.js';
export function topPlayerHeroes(stats,heroes=[]){
 const rows=(stats?.heroes??[]).map(row=>{const hero=heroes.find(h=>h.key===row.key);return {...row,name:hero?.name??row.key,portrait:safeImage(hero?.portrait),role:hero?.role??null};}).sort((a,b)=>(b.seconds??-1)-(a.seconds??-1)||a.key.localeCompare(b.key));
 const maximum=Math.max(0,...rows.map(h=>h.seconds??0));
 return {most:maximum>0?rows.find(h=>h.seconds===maximum):null,heroes:rows.map(h=>({...h,barPercent:maximum>0&&Number.isFinite(h.seconds)?h.seconds/maximum*100:null}))};
}
export function formatPlayerTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return t("정보 없음");const value=Math.floor(seconds);return t('player.seconds',{hours:Math.floor(value/3600),minutes:Math.floor(value%3600/60),seconds:value%60});}
export function playerQuery(value){
 const text=String(value??'').trim().normalize('NFC');
 if(!text||text.length>80||/[\p{Cc}<>/\\?&]/u.test(text))throw Error(t("닉네임 또는 이름#숫자 형태의 배틀태그를 입력해 주세요."));
 if(text.includes('#')){const m=/^([^#]+)#(\d{3,12})$/.exec(text);if(!m)throw Error(t("배틀태그는 이름#숫자 형태로 입력해 주세요."));return `${m[1]}-${m[2]}`;}
 return text;
}
export function playerPath(id){
 let value;try{value=decodeURIComponent(id);}catch{throw Error(t("플레이어 식별자가 올바르지 않습니다."));}
 if(typeof value!=='string'||!value||value.length>200||/[\p{Cc}/\\?#%]/u.test(value))throw Error(t("플레이어 식별자가 올바르지 않습니다."));
 return encodeURIComponent(value);
}
export function normalizePlayerSearch(raw){
 if(!raw||!Number.isInteger(raw.total)||raw.total<0||!Array.isArray(raw.results))throw Error(t("플레이어 검색 응답 형식이 올바르지 않습니다."));
 const seen=new Set();return {total:raw.total,players:raw.results.map(p=>{
  if(!p||typeof p.player_id!=='string'||typeof p.name!=='string'||!p.name.trim()||seen.has(p.player_id))throw Error(t("플레이어 검색 결과를 확인할 수 없습니다."));
  playerPath(p.player_id);seen.add(p.player_id);return {id:p.player_id,name:p.name,avatar:safeImage(p.avatar),isPublic:typeof p.is_public==='boolean'?p.is_public:null};
 })};
}
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function stat(row){if(!row||typeof row!=='object'||Array.isArray(row))return null;return {played:number(row.games_played),won:number(row.games_won),lost:number(row.games_lost),seconds:number(row.time_played),winRate:number(row.winrate)<=100?number(row.winrate):null,kda:number(row.kda)};}
export function normalizePlayerSummary(raw){
 if(!raw||typeof raw.username!=='string'||!raw.username.trim())throw Error(t("플레이어 프로필 응답 형식이 올바르지 않습니다."));
 const ranks=[];for(const platform of ['pc','console']){const frame=raw.competitive?.[platform];if(!frame)continue;for(const role of ['tank','damage','support','open']){const rank=frame[role];if(rank&&typeof rank.division==='string')ranks.push({platform,role,season:number(frame.season),division:rank.division,tier:number(rank.tier)});}}
 return {name:raw.username,avatar:safeImage(raw.avatar),title:typeof raw.title==='string'?raw.title:null,endorsement:number(raw.endorsement?.level),updatedAt:number(raw.last_updated_at),ranks};
}
export function normalizePlayerStats(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['general','heroes','roles'].some(k=>Object.hasOwn(raw,k)))throw Error(t("플레이어 통계 응답 형식이 올바르지 않습니다."));
 if(raw.heroes!=null&&(typeof raw.heroes!=='object'||Array.isArray(raw.heroes)))throw Error(t("영웅별 전적 응답 형식이 올바르지 않습니다."));
 return {general:stat(raw.general),heroes:Object.entries(raw.heroes??{}).filter(([key,row])=>/^[a-z0-9-]+$/.test(key)&&row).map(([key,row])=>({key,...stat(row)})).sort((a,b)=>(b.seconds??-1)-(a.seconds??-1)||a.key.localeCompare(b.key))};
}
