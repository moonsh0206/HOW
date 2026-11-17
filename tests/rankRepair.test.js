import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {buildRankFrame,validateRankArchive,rankChangeDiagnostic,storedRankChanges,RANK_ROLES} from '../src/models/rankArchiveModel.js';
import {rankDay} from '../src/models/dailyRankModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createHeroView} from '../src/views/heroView.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const heroes=RANK_ROLES.flatMap(role=>[0,1,2].map(i=>({key:`${role}-${i}`,name:`${role}-${i}`,role})));
const filters={platform:'pc',gamemode:'competitive',region:'asia',division:'diamond',map:'all'};
const today=rankDay(new Date().toISOString())+'T01:00:00.000Z',yesterday=new Date(Date.parse(today)-86400000).toISOString();
const frame=(fetchedAt,reverse=false)=>({filters,fetchedAt,records:heroes.map(h=>{let n=Number(h.key.at(-1));if(reverse)n=2-n;return {hero:h.key,winRate:60-n*5,pickRate:20-n*5,banRate:10-n*3};})});
const previous=buildRankFrame({heroes,current:frame(yesterday,true)}),current=buildRankFrame({heroes,current:frame(today),previous}),archive={schemaVersion:1,cohorts:[current]};
function model(){const m=createHeroModel();Object.assign(m.state,{heroes,statsStatus:'ready',status:'ready',statsFilters:filters,statistics:frame(today,true),dailyRankArchive:archive,dailyRankStatus:'ready',role:'tank'});return m;}
test('confirmed full-role mismatch no longer discards valid stored deltas or replaces them with live ordinal changes',()=>{
 const m=model(),input={archive,heroes,filters,role:'tank',sorted:m.sortedHeroes()};
 assert.equal(rankChangeDiagnostic(input),'ready-stored-order');
 const change=storedRankChanges(input).get('tank-0');assert.deepEqual([change.previousRank,change.currentRank,change.liveRank,change.delta],[3,1,3,2]);
 assert.equal(m.listSelection().changes.get('tank-0').delta,2);
 m.state.query='tank-0';assert.equal(m.listSelection().ordinals.get('tank-0'),3);assert.equal(m.listSelection().changes.get('tank-0').delta,2);
 m.state.favorites=new Set(['tank-0']);m.state.favoritesOnly=true;assert.equal(m.listSelection().changes.get('tank-0').delta,2);
 for(const sort of ['meta-desc','winrate-desc','pickrate-desc','banrate-desc','name-asc']){m.state.sort=sort;assert.equal(m.listSelection().changes.size,0);}
 m.state.sort='tier-desc';m.state.role='all';assert.equal(m.listSelection().changes.size,0);
});
test('first day, policy/roster changes, missing heroes and unclassified live roles still withhold markers',()=>{
 const corrupt=structuredClone(archive);corrupt.cohorts[0].comparison.deltas.tank['tank-0']=1;assert.throws(()=>validateRankArchive(corrupt),/previous rank positions/);
 const m=model(),input={archive,heroes,filters,role:'tank',sorted:m.sortedHeroes()};
 for(const row of [{...current,comparison:null},{...current,policyId:'old'},{...current,date:'2000-01-01'}])assert.equal(storedRankChanges({...input,archive:{schemaVersion:1,cohorts:[row]}}).size,0);
 assert.equal(storedRankChanges({...input,sorted:input.sorted.slice(1)}).size,0);
 assert.equal(storedRankChanges({...input,sorted:input.sorted.map(h=>({...h,tier:null}))}).size,0);
 for(const key of ['region','division','map'])assert.equal(storedRankChanges({...input,filters:{...filters,[key]:{region:'europe',division:'master',map:'busan'}[key]}}).size,0);
});
test('KO/EN/JA desktop/mobile: live rank and daily delta remain distinct with visible basis and accessible tooltip',async()=>{
 const html=await readFile('index.html','utf8');
 for(const lang of ['ko','en','ja'])for(const width of [320,390,1440]){
  const dom=new JSDOM(html,{url:'https://example.org/HOW/'}),saved={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});setLanguage(lang);
  try{const m=model(),view=createHeroView();view.render(m);
   const note=document.querySelector('#rank-comparison-note');assert.equal(note.hidden,false);assert.equal(note.textContent,t('rank.dailyBasis'));
   for(const selector of ['#hero-rows','#hero-cards']){const marker=document.querySelector(`${selector} [data-ordinal="3"] .rank-change`);assert.equal(marker.textContent,'▲2');assert.match(marker.title,/3.*1/);assert.match(marker.title,/KST/);assert.match(marker.getAttribute('aria-label'),/\+2/);}
   m.state.statistics=frame(today);view.render(m);assert.equal(document.querySelector('#hero-rows [data-ordinal="1"] .rank-change').textContent,'▲2');
   m.state.dailyRankArchive={schemaVersion:1,cohorts:[]};view.render(m);assert.equal(document.querySelectorAll('.rank-change').length,0);assert.equal(note.textContent,t('rank.pending'));
   m.state.role='all';view.render(m);assert(note.hidden);
  }finally{dom.window.close();Object.assign(globalThis,saved);setLanguage('ko');}
 }
});
