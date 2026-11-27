import {t} from './i18n.js';
const keys=Object.freeze({tank:'role.tank',damage:'role.damage',support:'role.support'});
export function roleTranslationKey(role){if(!Object.hasOwn(keys,role))throw Error('Unknown hero role');return keys[role];}
export const roleName=role=>t(roleTranslationKey(role));
export const ROLE_NAMES=Object.freeze(Object.defineProperties({},Object.fromEntries(Object.keys(keys).map(role=>[role,{enumerable:true,get:()=>roleName(role)}]))));
