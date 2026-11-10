import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {parseRoute,createRoutingController} from '../src/controllers/routingController.js';
import {createHeroController} from '../src/controllers/heroController.js';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {createHeroView} from '../src/views/heroView.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {createInsightView} from '../src/views/insightView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {normalizeStatistics,DEFAULT_FILTERS} from '../src/models/statisticsModel.js';

test('main menu routes keep legacy bookmarks and hero tab URLs',()=>{
 for(const hash of ['', '#', '#/', '#heroes','#favorites','#/tiers'])assert.deepEqual(parseRoute(hash),{page:'list'});
 assert.deepEqual(parseRoute('#/meta'),{page:'meta'});assert.deepEqual(parseRoute('#/player-search'),{page:'player-search'});
 for(const tab of ['overview','abilities','perks'])assert.deepEqual(parseRoute('#/heroes/genji/'+tab),{page:'detail',key:'genji',tab});
});

test('390 -> 1440 -> 390 on meta route reuses dashboard/insight/filter nodes and removes resize listeners',async()=>{
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://example.test/HOW/#/meta'}),prior={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
 const listeners=new Set(),media={matches:true,addEventListener(type,fn){listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);}};window.matchMedia=()=>media;
 let router,insights;
 try{
  const model=createHeroModel();insights=createInsightView();insights.render(model);router=createRoutingController({model,detailView:{render(){},focusHeading(){}},detailService:{async getHero(){throw Error('not requested');}}});router.start();
  const root=document.querySelector('.meta-insights'),filters=document.querySelector('#statistics-filters'),patch=document.querySelector('#current-patch-note');
  assert(!document.querySelector('#meta-page').hidden);assert.equal(root.parentElement.id,'meta-insights-host');
  for(const mobile of [false,true,false,true]){
   media.matches=mobile;for(const fn of listeners)fn();
   assert.equal(document.querySelector('#list-page').hidden,mobile);assert.equal(document.querySelector('#meta-page').hidden,!mobile);
   assert.equal(root.closest('.sidebar')!==null,!mobile);assert.equal(filters.parentElement.id==='meta-filter-host',mobile);
   assert.equal(patch.closest('.sidebar')!==null,!mobile);assert.equal(document.querySelector('.meta-insights'),root);
   const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
  }
 }finally{router?.stop();insights?.destroy();assert.equal(listeners.size,0);dom.window.close();Object.assign(globalThis,prior);}
});

test('shared model/filter/insights survive three menus, delayed detail, legacy favorites and original source menu return',async()=>{
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8'),dom=new JSDOM(html,{url:'https://example.test/HOW/'}),prior={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
 let router,controller,insights;const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
 Object.defineProperty(window,'innerWidth',{value:390,writable:true});
 try{
  const json=async name=>JSON.parse(await fs.readFile(new URL('./fixtures/'+name+'.json',import.meta.url),'utf8'));
  const heroes=normalizeHeroes(await json('overfast-heroes')),records=normalizeStatistics(await json('overfast-stats')),detail=normalizeHeroDetail(await json('overfast-genji'),'genji');
  const model=createHeroModel(),view=createHeroView();model.state.statsFilters={...DEFAULT_FILTERS,division:'all'};
  let heroesCalls=0,statsCalls=0,finishDetail;insights=createInsightView();router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{getHero:()=>new Promise(r=>{finishDetail=r;})}});router.start();
  controller=createHeroController({model,view,autoRefresh:false,storage:{save:()=>true},service:{async getHeroes(){heroesCalls++;return{heroes};}},statisticsService:{async getStatistics(filters){statsCalls++;return{filters,records,source:'OverFast API',fetchedAt:'2026-11-06T00:00:00Z'};}},onStateChange(){router.refresh();insights.render(model);}});controller.start();await flush();
  const filters=document.querySelector('#statistics-filters'),insight=document.querySelector('.meta-insights'),patch=document.querySelector('#current-patch-note'),stats=model.state.statistics;
  Object.assign(model.state,{query:'겐지',role:'damage',sort:'name-asc'});
  const go=async hash=>{location.hash=hash;window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();};
  assert(!document.querySelector('#list-page').hidden);assert.equal(document.querySelectorAll('.main-menu>a').length,3);
  await go('#/meta');assert(!document.querySelector('#meta-page').hidden);assert(document.querySelector('#list-page').hidden);assert.equal(filters.parentElement.id,'meta-filter-host');assert.equal(insight.parentElement.id,'meta-insights-host');assert.equal(patch.parentElement.id,'meta-patch-host');assert.equal(document.querySelector('[data-main-menu=meta]').getAttribute('aria-current'),'page');
  await go('#/heroes/genji');await go('#/player-search');finishDetail({detail,fetchedAt:'2026-11-06T00:00:00Z'});await flush();assert(document.querySelector('#hero-detail-page').hidden);assert(!document.querySelector('#player-search-page').hidden);assert.match(document.querySelector('#player-search-page').textContent,/플레이어 전적 검색/);assert(document.querySelector('#player-search-page input'));
  await go('#/meta');await go('#/heroes/genji');finishDetail({detail,fetchedAt:'2026-11-06T00:00:00Z'});await flush();assert.equal(document.querySelector('.detail-back').hash,'#/meta');
  await go('#/tiers');assert.equal(filters.parentElement.className,'cohort-banner');assert.equal(model.state.statistics,stats);assert.equal(model.state.query,'겐지');assert.equal(model.state.role,'damage');assert.equal(model.state.sort,'name-asc');
  model.state.favorites.add('genji');await go('#favorites');assert(model.state.favoritesOnly);await go('#/meta');assert(model.state.favoritesOnly);await go('#/tiers');assert(!model.state.favoritesOnly);
  assert.equal(heroesCalls,1);assert.equal(statsCalls,1);assert.equal(document.querySelectorAll('#statistics-filters').length,1);assert.equal(document.querySelectorAll('.meta-insights').length,1);assert.equal(document.querySelectorAll('#current-patch-note').length,1);
 }finally{controller?.stop();router?.stop();insights?.destroy();dom.window.close();Object.assign(globalThis,prior);}
});
