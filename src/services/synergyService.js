import { SYNERGIES } from '../data/synergies.js';
import { normalizeSynergies } from '../models/synergyModel.js';
export function createSynergyService(rows=SYNERGIES){
 let data;try{data=normalizeSynergies(rows);}catch{return {getHeroSynergies:()=>({status:'error',allies:[]})};}
 return {getHeroSynergies(key,heroes){const byKey=new Map(heroes.map(h=>[h.key,h]));const allies=data.filter(r=>r.heroKey===key&&byKey.has(r.allyHeroKey)).map(r=>({...r,name:byKey.get(r.allyHeroKey).name,portrait:byKey.get(r.allyHeroKey).portrait}));return {status:allies.length?'ready':'empty',allies};}};
}
