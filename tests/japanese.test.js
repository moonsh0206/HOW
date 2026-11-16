import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {CATALOGS,LANGUAGES,resolveLanguage,initializeLanguage,setLanguage,apiLocale,t,LANGUAGE_KEY} from '../src/i18n/i18n.js';
import {localizedURL,routeHash,installLocalizedNavigation} from '../src/i18n/routes.js';
import {createOverfastService} from '../src/services/heroService.js';
import {createHeroDetailService} from '../src/services/heroDetailService.js';
import {divisionName,filterLabel,DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {METRICS} from '../src/views/statisticsUI.js';
import {HISTORY_LABELS} from '../src/views/pickHistoryView.js';
import {perkSelectionForItem} from '../src/models/perkSelectionModel.js';
import mappings from '../src/data/perkMappings.json' with {type:'json'};
import jaPerks from '../src/data/perkNamesJa.json' with {type:'json'};
import {attachMetaTiers} from '../src/domain/meta.js';
import {hotHeroes} from '../src/domain/insights.js';
import jaHeroNames from '../src/data/jaHeroNames.json' with {type:'json'};
test('all three catalogs have exact keys, placeholders and no residual Korean in Japanese',()=>{
 const keys=Object.keys(CATALOGS.ko).sort(),tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
 for(const code of LANGUAGES){assert.deepEqual(Object.keys(CATALOGS[code]).sort(),keys);for(const key of keys){assert(CATALOGS[code][key].trim());assert.deepEqual(tokens(CATALOGS[code][key]),tokens(CATALOGS.ko[key]));if(code==='ja')assert(!/[가-힣]/.test(CATALOGS.ja[key]),key);}}
});
test('language precedence, browser preference order and unsupported fallback',()=>{
 for(const [browser,expected] of [['ko-KR','ko'],['en-US','en'],['ja-JP','ja'],['fr-FR','en']])assert.equal(resolveLanguage({browser}),expected);
 assert.equal(resolveLanguage({browsers:['fr-FR','ja-JP','en-US'],browser:'ko-KR'}),'ja');
 for(const code of LANGUAGES){assert.equal(resolveLanguage({pathname:`/HOW/${code}/heroes/ana`,base:'/HOW/',saved:'en',browser:'ko-KR'}),code);assert.equal(resolveLanguage({saved:code,browser:'fr'}),code);}
});
test('initial base visit uses history replacement; explicit links and browser back retain their locale',()=>{
 for(const [path,saved,expected] of [['/HOW/',null,'ja'],['/HOW/', 'ko','ko'],['/HOW/en/heroes/ana', 'ja','en']]){
  const dom=new JSDOM('<body/>',{url:'https://example.org'+path}),win=dom.window;Object.defineProperty(win.navigator,'languages',{value:['ja-JP']});if(saved)win.localStorage.setItem(LANGUAGE_KEY,saved);
  initializeLanguage({base:'/HOW/',window:win});const length=win.history.length,stop=installLocalizedNavigation({base:'/HOW/',window:win});assert(win.location.pathname.startsWith(`/HOW/${expected}/`));assert.equal(win.history.length,length);stop();win.close();
 }setLanguage('ko');
});
test('Japanese routes preserve hero tabs and opaque player identifiers',()=>{
 for(const path of ['tiers','meta','player-search','heroes/ana','heroes/ana/perks']){const url=localizedURL('#/'+path,'ja','/HOW/');assert.equal(url,'/HOW/ja/'+path);assert.equal(routeHash({pathname:url,hash:''},'/HOW/'),'#/'+path);}
 assert.equal(localizedURL('#/players/opaque%257Ckey','ja','/HOW/'),'/HOW/ja/player-search#/players/opaque%257Ckey');
});
test('locale caches isolate actual Japanese API captures; presentation labels update live',async()=>{
 const heroes=JSON.parse(await readFile('docs/qa/japanese/heroes-ja.json','utf8')),ana=JSON.parse(await readFile('docs/qa/japanese/ana-ja.json','utf8'));let calls=0;
 const service=createOverfastService({fetcher:async url=>{assert(url.endsWith('locale=ja-jp'));calls++;return {ok:true,json:async()=>heroes};}}),details=createHeroDetailService({fetcher:async url=>{assert(url.endsWith('locale=ja-jp'));calls++;return {ok:true,json:async()=>ana};}});
 try{setLanguage('ja');assert.equal(apiLocale(),'ja-jp');assert.equal((await service.getHeroes()).heroes.find(h=>h.key==='ana').name,'アナ');assert.equal((await details.getHero('ana')).detail.name,'アナ');await service.getHeroes();await details.getHero('ana');assert.equal(calls,2);assert.equal(divisionName('diamond_plus'),'ダイヤモンド以上');assert(!/[가-힣]/.test(filterLabel(DEFAULT_FILTERS)));assert.equal(METRICS[1][1],'勝率');assert.equal(HISTORY_LABELS.pickRate,'ピック率');assert.equal(t('player.favorites',{count:2}),'お気に入りプレイヤー・2');}finally{setLanguage('ko');}
});
test('216 Japanese perk names resolve the same versioned identity without order or fuzzy joins',()=>{
 let count=0;for(const [hero,mapping] of Object.entries(mappings.heroes))for(const ref of mapping.perks){const ja=jaPerks.entries[ref.perkKey];assert(ja);assert.equal(ja.heroKey,hero);assert.equal(ja.tier,ref.tier);assert.equal(ja.icon,ref.icon);const result={heroKey:hero,entries:[{perkKey:ref.perkKey,tier:ref.tier,status:'ready',selectionRate:42,selectionCount:7}]};const options={date:'2026-11-16'};
 const selected=perkSelectionForItem(hero,ref.tier,{name:ja.name,icon:ja.icon},result,options);assert.equal(selected.selectionRate,42);assert.equal(perkSelectionForItem(hero,ref.tier,{name:ja.name+'?',icon:ja.icon},result,options).status,'mapping-review');count++;}assert.equal(count,216);
});
test('KO/EN/JA change neither Meta Score/ranks nor HOT membership for identical statistical fixtures',async()=>{
 const heroes=JSON.parse(await readFile('tests/fixtures/overfast-heroes.json','utf8')),records=heroes.map((hero,i)=>({hero:hero.key,winRate:50+i/100,pickRate:3+i/100,banRate:1}));
 const current={source:'OverFast API',filters:{...DEFAULT_FILTERS,division:'diamond'},fetchedAt:'2026-11-16T01:00:00.000Z',records},previous={...current,collectedAt:'2026-11-15T01:00:00.000Z',records:records.map(r=>({...r,winRate:r.winRate-1,pickRate:r.pickRate-2}))};
 let baseline;try{for(const code of LANGUAGES){setLanguage(code);const attached=attachMetaTiers(heroes.map(h=>({...h,name:code==='ja'?jaHeroNames[h.key]:code==='en'?h.key:h.name})),records),hot=hotHeroes(attached,current,previous);assert.equal(hot.available,true);assert(hot.heroes.length>0);const result={tiers:attached.map(h=>[h.key,h.metaScore,h.roleRank,h.tier]),hot:hot.heroes.map(h=>h.key)};if(baseline)assert.deepEqual(result,baseline);else baseline=result;}}finally{setLanguage('ko');}
});
