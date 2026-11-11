import ko from './ko.js';
import en from './en.js';
export const LANGUAGE_KEY='how:language:v1';
export const LANGUAGES=['ko','en'];
let language='ko';
export function resolveLanguage({pathname='',base='/',saved,browser='en'}={}){
 const prefix=base.endsWith('/')?base:base+'/';
 const explicit=pathname.startsWith(prefix)?pathname.slice(prefix.length).split('/')[0]:'';
 return LANGUAGES.includes(explicit)?explicit:LANGUAGES.includes(saved)?saved:browser.toLowerCase().startsWith('ko')?'ko':'en';
}
export function getLanguage(){return language;}
export function apiLocale(){return language==='ko'?'ko-kr':'en-us';}
export function formatLocale(){return language==='ko'?'ko-KR':'en-US';}
export function setLanguage(value){if(!LANGUAGES.includes(value))throw Error('Unsupported language');language=value;}
export function t(key,values={}){
 if(!Object.hasOwn(ko,key))throw Error(`Unknown translation key: ${key}`);
 const text=(language==='en'?en:ko)[key]??ko[key];
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??`{${name}}`));
}
export function label(text){return Object.hasOwn(ko,String(text))?t(String(text)):text;}
export function errorText(text){if(language==='ko'||!/[가-힣]/.test(String(text??'')))return text;const translated=label(text);return translated!==text?translated:'Unable to retrieve data. Please try again later.';}
export function initializeLanguage({base='/',window:win=globalThis.window}={}){
 let saved;try{saved=win.localStorage.getItem(LANGUAGE_KEY);}catch{}
 setLanguage(resolveLanguage({pathname:win.location.pathname,base,saved,browser:win.navigator.language}));
 win.document.documentElement.lang=language;
 return language;
}
if(typeof window!=='undefined')initializeLanguage({base:import.meta.env?.BASE_URL??'/'});
