import ko from './ko.js';
import en from './en.js';
import ja from './ja.js';
export const LANGUAGE_KEY='how:language:v1';
export const LANGUAGES=Object.freeze(['ko','en','ja']);
export const CATALOGS=Object.freeze({ko,en,ja});
export const LANGUAGE_NAMES=Object.freeze({ko:'한국어',en:'English',ja:'日本語'});
const apiLocales={ko:'ko-kr',en:'en-us',ja:'ja-jp'},formatLocales={ko:'ko-KR',en:'en-US',ja:'ja-JP'};
const sourceKeys=new Map();
for(const catalog of Object.values(CATALOGS))for(const [key,text] of Object.entries(catalog))if(!text.includes('{'))sourceKeys.set(text,key);
let language='ko';
export function resolveLanguage({pathname='',base='/',saved,browser='en',browsers=[]}={}){
 const prefix=base.endsWith('/')?base:base+'/';
 const explicit=pathname.startsWith(prefix)?pathname.slice(prefix.length).split('/')[0]:'';
 const preferred=[...browsers,browser].map(value=>String(value).toLowerCase().split('-')[0]).find(value=>LANGUAGES.includes(value));
 return LANGUAGES.includes(explicit)?explicit:LANGUAGES.includes(saved)?saved:preferred??'en';
}
export function getLanguage(){return language;}
export function apiLocale(){return apiLocales[language];}
export function formatLocale(){return formatLocales[language];}
export function officialLink(url){return typeof url==='string'&&language==='ja'?url.replace(/\/(ko-kr|en-us)\//,'/ja-jp/'):url;}
export function setLanguage(value){if(!LANGUAGES.includes(value))throw Error('Unsupported language');language=value;}
export function t(key,values={}){
 if(!Object.hasOwn(ko,key))throw Error(`Unknown translation key: ${key}`);
 const text=CATALOGS[language][key]??ko[key];
 return text.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??`{${name}}`));
}
export function label(text){const key=Object.hasOwn(ko,String(text))?String(text):sourceKeys.get(text);return key?t(key):text;}
export function localizedRecord(source){return Object.freeze(Object.defineProperties({},Object.fromEntries(Object.entries(source).map(([key,text])=>[key,{enumerable:true,get:()=>label(text)}]))));}
export function errorText(text){if(language==='ko'||!/[가-힣]/.test(String(text??'')))return text;const translated=label(text);return translated!==text?translated:language==='ja'?'データを取得できませんでした。時間をおいて再試行してください。':'Unable to retrieve data. Please try again later.';}
export function initializeLanguage({base='/',window:win=globalThis.window}={}){
 let saved;try{saved=win.localStorage.getItem(LANGUAGE_KEY);}catch{}
 setLanguage(resolveLanguage({pathname:win.location.pathname,base,saved,browser:win.navigator.language,browsers:win.navigator.languages??[]}));
 win.document.documentElement.lang=language;
 return language;
}
if(typeof window!=='undefined')initializeLanguage({base:import.meta.env?.BASE_URL??'/'});
