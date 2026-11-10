import {playerPath} from '../models/playerModel.js';
import {safeImage} from '../models/heroModel.js';
export const PLAYER_FAVORITES_KEY='how:player-favorites:v1';
function clean(players){
 if(!Array.isArray(players))return [];
 const seen=new Set();return players.flatMap(player=>{
  try{if(typeof player?.id!=='string'||typeof player.name!=='string'||!player.name.trim())return [];const key=playerPath(player.id);if(seen.has(key))return [];seen.add(key);return [{id:player.id,name:player.name,avatar:safeImage(player.avatar),isPublic:typeof player.isPublic==='boolean'?player.isPublic:null}];}catch{return [];}
 });
}
export function createPlayerFavoritesStorage(getStorage=()=>globalThis.localStorage){return {
 load(){try{return {players:clean(JSON.parse(getStorage().getItem(PLAYER_FAVORITES_KEY)??'[]')),available:true};}catch{return {players:[],available:false};}},
 save(players){try{getStorage().setItem(PLAYER_FAVORITES_KEY,JSON.stringify(clean([...players])));return true;}catch{return false;}},
};}
