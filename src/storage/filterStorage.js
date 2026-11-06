import {validateFilters} from '../models/statisticsModel.js';
const KEY='how:statistics-filters:v1';
// Per-tab persistence across refresh; invalid/blocked storage never prevents startup.
export function createFilterStorage(getStorage=()=>globalThis.sessionStorage){return {
 load(){try{const raw=getStorage().getItem(KEY);return raw?validateFilters(JSON.parse(raw)):null;}catch{return null;}},
 save(filters){try{getStorage().setItem(KEY,JSON.stringify(validateFilters(filters)));return true;}catch{return false;}}
};}
