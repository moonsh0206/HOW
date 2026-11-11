import {playerPath} from '../models/playerModel.js';
import {safeImage} from '../models/heroModel.js';
export const PLAYER_FAVORITES_KEY='how:player-favorites:v1';
export function favoriteProfile(frame){
 const data=frame?.data;
 if(typeof data?.name!=='string'||!data.name.trim()||!Number.isFinite(Date.parse(frame.fetchedAt)))return undefined;
 const nonnegative=value=>Number.isFinite(value)&&value>=0?value:null;
 const ranks=(Array.isArray(data.ranks)?data.ranks:[]).filter(r=>['pc','console'].includes(r.platform)&&['tank','damage','support','open'].includes(r.role)&&['bronze','silver','gold','platinum','emerald','diamond','master','grandmaster','champion','ultimate'].includes(r.division)).slice(0,8).map(r=>({platform:r.platform,role:r.role,division:r.division,tier:nonnegative(r.tier),season:nonnegative(r.season)}));
 return {data:{name:data.name,avatar:safeImage(data.avatar),title:typeof data.title==='string'?data.title:null,endorsement:nonnegative(data.endorsement),updatedAt:nonnegative(data.updatedAt),ranks},fetchedAt:frame.fetchedAt,cached:true,providerAgeSeconds:nonnegative(frame.providerAgeSeconds),providerStale:!!frame.providerStale};
}
function clean(players){
 if(!Array.isArray(players))return [];
 const seen=new Set();return players.flatMap(player=>{
  try{if(typeof player?.id!=='string'||typeof player.name!=='string'||!player.name.trim())return [];const key=playerPath(player.id);if(seen.has(key))return [];seen.add(key);const profile=favoriteProfile(player.profile);return [{id:player.id,name:player.name,avatar:safeImage(player.avatar),isPublic:typeof player.isPublic==='boolean'?player.isPublic:null,...(profile?{profile}:{})}];}catch{return [];}
 });
}
export function createPlayerFavoritesStorage(getStorage=()=>globalThis.localStorage){return {
 load(){try{return {players:clean(JSON.parse(getStorage().getItem(PLAYER_FAVORITES_KEY)??'[]')),available:true};}catch{return {players:[],available:false};}},
 save(players){try{getStorage().setItem(PLAYER_FAVORITES_KEY,JSON.stringify(clean([...players])));return true;}catch{return false;}},
};}
