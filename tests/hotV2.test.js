import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {hotHeroes,INSIGHT_POLICY} from '../src/domain/insights.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createInsightView} from '../src/views/insightView.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const filters={...DEFAULT_FILTERS,division:'diamond'};
const old={source:'OverFast API',filters,collectedAt:'2026-11-10T01:00:00.000Z',patch:null,records:[{hero:'moira',winRate:50,pickRate:4,banRate:0}]};
const current={source:'OverFast API',filters,fetchedAt:'2026-11-11T01:00:00.000Z',patch:null};
const hero=(pickDelta,winDelta)=>({key:'moira',name:'Moira',role:'support',statistics:{hero:'moira',winRate:50+winDelta,pickRate:4+pickDelta,banRate:0}});
test('HOT v2 simultaneous thresholds: flat/declining win and insufficient pick excluded; exact boundary included',()=>{
 for(const [pick,win,expected] of [[2,0,0],[1,.5,1],[2,-.2,0],[.5,2,0],[2,2,1],[.9999,1,0],[1,.4999,0]])assert.equal(hotHeroes([hero(pick,win)],current,old).heroes.length,expected,`${pick}/${win}`);
 assert.equal(INSIGHT_POLICY.hotWinDelta,.5);
});
test('HOT v2 missing, review, actual zero and minimum adoption checks are preserved',()=>{
 for(const row of [{...hero(2,1),statistics:{winRate:null,pickRate:6}},{...hero(2,1),statistics:{winRate:51,pickRate:null}},{...hero(2,1),statistics:{winRate:0,pickRate:6}},{...hero(2,1),statistics:{winRate:51,pickRate:6,quality:{fields:{winRate:'review'}}}}])assert.equal(hotHeroes([row],current,old).heroes.length,0);
 assert.equal(hotHeroes([hero(2,1)],current,{...old,records:[]}).heroes.length,0);
 assert.equal(hotHeroes([hero(2,1)],current,{...old,records:[{...old.records[0],winRate:null}]}).heroes.length,0);
 const low={...hero(0,0),statistics:{winRate:51,pickRate:.8}};assert.equal(hotHeroes([low],current,{...old,records:[{hero:'moira',winRate:50,pickRate:0}]}).heroes.length,0);
});
test('HOT v2 same-cohort and patch/window safety still gate comparison',()=>{
 assert.equal(hotHeroes([hero(2,1)],current,null).available,false);
 for(const field of ['region','division','map','gamemode']){const value={region:'europe',division:'master',map:'busan',gamemode:'quickplay'}[field];assert.equal(hotHeroes([hero(2,1)],current,{...old,filters:{...filters,[field]:value}}).available,false);}
 for(const patch of [{patch:'new-patch'},{statisticsWindow:'since-patch-start'},{stale:true}])assert.equal(hotHeroes([hero(2,1)],{...current,...patch},old).available,false);
});
test('HOT v2 win increase first, pick increase second, stable key tie; cap three with no forced filling',()=>{
 const changes=[['a',4,1],['b',2,2],['c',3,2],['d',3,2]];
 const heroes=changes.map(([key,pick,win])=>({...hero(pick,win),key,name:key}));
 const previous={...old,records:changes.map(([key])=>({...old.records[0],hero:key}))};
 const before=JSON.stringify({heroes,previous});
 assert.deepEqual(hotHeroes(heroes,current,previous).heroes.map(h=>h.key),['c','d','b']);
 for(let count=0;count<=2;count++)assert.equal(hotHeroes(heroes.slice(0,count),current,previous).heroes.length,count);
 assert.equal(JSON.stringify({heroes,previous}),before);
});
test('HOT v2 KO/EN PC/mobile: exact empty text, threshold note, both changes and KST observations',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const lang of ['ko','en'])for(const width of [390,1440]){
  const dom=new JSDOM(html,{url:'https://example.org/HOW/'}),saved={window:globalThis.window,document:globalThis.document};Object.assign(globalThis,{window:dom.window,document:dom.window.document});dom.window.matchMedia=()=>({matches:width<=767,addEventListener(){},removeEventListener(){}});setLanguage(lang);
  const model=createHeroModel();const row=hero(2,0);Object.assign(model.state,{heroes:[row],statsStatus:'ready',statsFilters:filters,statistics:{...current,records:[row.statistics]},previousSnapshot:old,snapshotStatus:'ready'});
  const view=createInsightView();
  try{view.render(model);const hot=document.querySelector('#hot-content');assert.equal(hot.querySelector('p').textContent,t('hot.empty'));assert.match(hot.textContent,/0\.5/);assert.match(hot.textContent,/KST/);assert(hot.textContent.includes(t('hot.thresholdNote')));
   model.state.statistics.records=[hero(2,1).statistics];view.render(model);assert.equal(hot.querySelectorAll('.insight-hero').length,1);assert.match(hot.textContent,/\+2\.0/);assert.match(hot.textContent,/\+1\.0/);assert.equal(hot.querySelector('details').open,width>767);
  }finally{view.destroy();dom.window.close();Object.assign(globalThis,saved);setLanguage('ko');}
 }
});
