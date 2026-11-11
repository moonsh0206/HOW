import test from 'node:test';
import assert from 'node:assert/strict';
import ko from '../src/i18n/ko.js';
import en from '../src/i18n/en.js';
import {resolveLanguage,setLanguage,getLanguage,t,apiLocale} from '../src/i18n/i18n.js';
import {createOverfastService} from '../src/services/heroService.js';
import {createHeroDetailService} from '../src/services/heroDetailService.js';
import {localizedURL,routeHash} from '../src/i18n/routes.js';
import {attachMetaTiers} from '../src/domain/meta.js';
import {readFile} from 'node:fs/promises';
import {auditI18n} from '../scripts/audit-i18n.js';
import {readLanguageTransfer} from '../src/i18n/languageView.js';
const response=data=>({ok:true,json:async()=>data});
test('translation catalogs have identical keys/placeholders and language priority is URL > stored > browser',()=>{
 assert.deepEqual(Object.keys(ko).sort(),Object.keys(en).sort());for(const key of Object.keys(ko)){assert(en[key].trim());assert.deepEqual([...ko[key].matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),[...en[key].matchAll(/\{\w+\}/g)].map(m=>m[0]).sort());}
 assert.equal(resolveLanguage({pathname:'/HOW/en/tiers',base:'/HOW/',saved:'ko',browser:'ko-KR'}),'en');assert.equal(resolveLanguage({pathname:'/ko/tiers',base:'/',saved:'en'}),'ko');assert.equal(resolveLanguage({saved:'ko',browser:'en'}),'ko');assert.equal(resolveLanguage({browser:'ko-KR'}),'ko');assert.equal(resolveLanguage({browser:'fr-FR'}),'en');
 try{setLanguage('en');assert.equal(t('player.favorites',{count:2}),'Favorite players · 2');assert.equal(apiLocale(),'en-us');assert.throws(()=>t('missing'));assert.throws(()=>setLanguage('fr'));}finally{setLanguage('ko');}assert.equal(getLanguage(),'ko');
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');try{Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw Error('blocked storage');}});assert.equal(readLanguageTransfer(),null);}finally{if(descriptor)Object.defineProperty(globalThis,'sessionStorage',descriptor);else delete globalThis.sessionStorage;}
});
test('all View literal messages are extracted and every called key exists in both catalogs',async()=>{
 const report=await auditI18n();assert(report.calls>200);assert.deepEqual(report.issues,[]);
});
test('hybrid routes preserve language, base, tabs, opaque IDs and legacy hash routes',()=>{
 for(const base of ['/','/HOW/'])for(const lang of ['ko','en']){
  const path=localizedURL('#/heroes/genji/perks',lang,base);assert.equal(path,`${base}${lang}/heroes/genji/perks`);assert.equal(routeHash({pathname:path,hash:''},base),'#/heroes/genji/perks');
  assert.equal(routeHash({pathname:`${base}${lang}/index.html`,hash:''},base),'#/tiers');assert.equal(localizedURL('#/unknown',lang,base),`${base}${lang}/tiers#/unknown`);
  const id='abc%257Cdef';assert.equal(localizedURL('#/players/'+id,lang,base),`${base}${lang}/player-search#/players/${id}`);assert.equal(routeHash({pathname:base+lang+'/tiers',hash:'#favorites'},base),'#favorites');
 }assert.throws(()=>localizedURL('#/tiers','fr'));
});
test('language-specific names cannot alter Meta Score, role ranks or tiers for identical statistics',async()=>{
 const heroes=JSON.parse(await readFile(new URL('./fixtures/overfast-heroes.json',import.meta.url),'utf8'));
 const rows=heroes.map((hero,i)=>({hero:hero.key,winRate:45+i/10,pickRate:2+i/10,banRate:i/10}));
 const before=attachMetaTiers(heroes,rows),after=attachMetaTiers(heroes.map(h=>({...h,name:h.key})),rows);
 assert.deepEqual(before.map(h=>[h.key,h.metaScore,h.roleRank,h.tier]),after.map(h=>[h.key,h.metaScore,h.roleRank,h.tier]));
});
test('all current curated patch summaries, ability names and subrole effects have English keys',async()=>{
 // The reviewed baseline must be translated; future verified notes must not be
 // prevented from publishing merely because their HOW English summary is pending.
 const patches=JSON.parse(await readFile(new URL('./fixtures/official-patch-november-complete.json',import.meta.url),'utf8'));
 for(const p of patches.patches)for(const text of [p.officialTitle,p.summaryKo,...(p.highlightsKo??[]),...p.changes.flatMap(c=>[c.abilityName,c.summaryKo])]){if(text==='EMP')continue;assert(Object.hasOwn(en,text),text);assert(!/[가-힣]/.test(en[text]),text);}
 const subroles=JSON.parse(await readFile(new URL('../src/data/subroles.json',import.meta.url),'utf8'));for(const row of Object.values(subroles.effects))for(const field of ['subroleNameKo','descriptionKo'])assert(Object.hasOwn(en,row[field]),row[field]);
});
test('hero metadata uses separate locale caches and preserves hero identifiers',async()=>{
 let lang='ko-kr',urls=[];const service=createOverfastService({locale:()=>lang,fetcher:async url=>{urls.push(url);return response([{key:'ana',name:lang==='ko-kr'?'아나':'Ana',role:'support'}]);}});
 assert.equal((await service.getHeroes()).heroes[0].name,'아나');lang='en-us';assert.equal((await service.getHeroes()).heroes[0].name,'Ana');lang='ko-kr';await service.getHeroes();assert.equal(urls.length,2);assert(urls[1].endsWith('locale=en-us'));
 const details=createHeroDetailService({locale:()=>lang,fetcher:async url=>{urls.push(url);return response({name:lang==='ko-kr'?'아나':'Ana',role:'support',abilities:[],perks:{minor:[],major:[]}});}});await details.getHero('ana');lang='en-us';assert.equal((await details.getHero('ana')).detail.name,'Ana');lang='ko-kr';assert.equal((await details.getHero('ana')).detail.name,'아나');assert.equal(urls.length,4);
});
