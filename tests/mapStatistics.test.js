import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { DEFAULT_FILTERS as UI_DEFAULT_FILTERS,statisticsQuery,validateFilters } from '../src/models/statisticsModel.js';
const DEFAULT_FILTERS={...UI_DEFAULT_FILTERS,division:'diamond'}; // Explicit original-cohort regression fixture.
import { normalizeMaps } from '../src/models/mapModel.js';
import { createMapService } from '../src/services/mapService.js';
import { createStatisticsService } from '../src/services/statisticsService.js';
import { createMapStatisticsController } from '../src/controllers/mapStatisticsController.js';
import { renderMapStatistics } from '../src/views/mapStatisticsView.js';
import { createHeroModel } from '../src/models/heroModel.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createRoutingController } from '../src/controllers/routingController.js';
import { createHeroController } from '../src/controllers/heroController.js';
import { createHeroView } from '../src/views/heroView.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const rawMaps=[{key:'busan',name:'Busan',uses:['standard'],gamemodes:['control']},{key:'kings-row',name:"King's Row",uses:['standard','stadium'],gamemodes:['hybrid']}];

test('maps: strict verified keys, standard competitive modes and exact query keys',()=>{
 assert.equal(new URLSearchParams(statisticsQuery(DEFAULT_FILTERS)).has('map'),false);
 const query=new URLSearchParams(statisticsQuery({...DEFAULT_FILTERS,map:'busan'}));
 assert.equal(query.get('map'),'busan');assert.equal(query.get('competitive_division'),'diamond');
 for(const map of ['bad','practice-range','anubis','busan&region=americas'])assert.throws(()=>validateFilters({...DEFAULT_FILTERS,map}));
 assert.equal(normalizeMaps([...rawMaps,{key:'busan',name:'wrong',uses:['stadium'],gamemodes:['control']},{key:'practice-range',name:'Training',uses:['training'],gamemodes:['practice-range']}]).length,2);
 assert.throws(()=>normalizeMaps([rawMaps[0],rawMaps[0]]));
});

test('maps service: shared list request/cache, malformed response and failure retry',async()=>{
 let calls=0,fail=true;
 const service=createMapService({fetcher:()=>{calls++;if(fail)throw new TypeError('offline');return {ok:true,json:async()=>rawMaps};}});
 await assert.rejects(service.getMaps());fail=false;
 const [a,b]=await Promise.all([service.getMaps(),service.getMaps()]);assert.equal(a,b);assert.equal(calls,2);
 await service.getMaps();assert.equal(calls,2);
 await assert.rejects(createMapService({fetcher:async()=>({ok:true,json:async()=>({})})}).getMaps());
});

test('map statistics cache: all/busan/kings-row stay separate, pending requests deduplicate',async()=>{
 const calls=[];const service=createStatisticsService({fetcher:async url=>{calls.push(url);return {ok:true,headers:new Headers(),json:async()=>[{hero:'torbjorn',winrate:50,pickrate:0,banrate:null}]};}});
 const busan={...DEFAULT_FILTERS,map:'busan'};
 const [a,b]=await Promise.all([service.getStatistics(busan),service.getStatistics(busan)]);assert.equal(a,b);
 await service.getStatistics(DEFAULT_FILTERS);await service.getStatistics({...DEFAULT_FILTERS,map:'kings-row'});await service.getStatistics(busan);
 assert.equal(calls.length,3);assert.equal(a.records[0].pickRate,0);assert.equal(a.records[0].banRate,null);
});

test('map controller: lazy queries, late map/hero/cohort responses cannot overwrite current state',async()=>{
 const requests=[];const controller=createMapStatisticsController({mapService:{async getMaps(){return normalizeMaps(rawMaps);}},statisticsService:{getStatistics(filters){return new Promise(resolve=>requests.push({filters,resolve}));}},onChange(){}});
 controller.setContext('torbjorn',DEFAULT_FILTERS);await flush();assert.equal(requests.length,0);
 controller.setContext('torbjorn',{...DEFAULT_FILTERS,map:'busan'});controller.setContext('torbjorn',{...DEFAULT_FILTERS,map:'kings-row'});assert.equal(requests.length,2);
 requests[1].resolve({filters:requests[1].filters,records:[{hero:'torbjorn',winRate:55}]});await flush();
 requests[0].resolve({filters:requests[0].filters,records:[{hero:'torbjorn',winRate:99}]});await flush();assert.equal(controller.getState().baseline.records[0].winRate,55);
 controller.setContext('ana',{...DEFAULT_FILTERS,region:'europe',map:'busan'});assert.equal(controller.getState().baseline,null);
 controller.leave();requests[2].resolve({filters:requests[2].filters,records:[{hero:'torbjorn',winRate:99}]});await flush();assert.equal(controller.getState().baseline,null);
});

test('map view: zero/null, exact cohort comparison, empty state and stale source',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{
  const model=createHeroModel();model.state.statsFilters={...DEFAULT_FILTERS};model.state.statistics={filters:DEFAULT_FILTERS,records:[{hero:'torbjorn',winRate:50}]};
  const state={maps:normalizeMaps(rawMaps),listStatus:'ready',selectedMap:'busan',status:'ready',result:{filters:{...DEFAULT_FILTERS,map:'busan'},records:[{hero:'torbjorn',winRate:0,pickRate:0,banRate:null,quality:{fields:{winRate:'verified'}}}],fetchedAt:'2026-11-04T00:00:00Z',stale:true}};
  state.baseline=model.state.statistics;model.state.statsFilters={...DEFAULT_FILTERS,map:'busan'};model.state.statistics=state.result;
  const panel=renderMapStatistics(state,model,'torbjorn');
  assert.deepEqual([...panel.querySelectorAll('dd')].map(el=>el.textContent),['50%','0%','-50.0%p','0%','미제공']);
  assert.equal(panel.querySelector('select'),null);assert(panel.textContent.includes('오래된 데이터'));
  model.state.statistics={...state.result,records:[]};assert(renderMapStatistics(state,model,'torbjorn').textContent.includes('해당 맵 통계 미제공'));
  state.baseline={...state.baseline,filters:{...DEFAULT_FILTERS,region:'americas'}};
  assert.equal(renderMapStatistics(state,model,'torbjorn').querySelector('dd').textContent,'미제공');
 }finally{globalThis.document=prior;dom.window.close();}
});

test('detail map integration: only overview, selection event, favorite and all-map tiers unchanged',async()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/overfast-genji.json',import.meta.url)));
 const dom=new JSDOM(html,{url:'https://example.com/HOW/#/heroes/genji'}),prior={document:globalThis.document,window:globalThis.window,location:globalThis.location};Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});
 dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 let router,controller;try{
  const model=createHeroModel(),calls=[];model.state.statsFilters={...DEFAULT_FILTERS};
  const statisticsService=createStatisticsService({fetcher:async url=>{calls.push(url);return{ok:true,headers:new Headers(),json:async()=>[{hero:'genji',winrate:url.includes('map=busan')?40:55,pickrate:2,banrate:0}]};}});
  const maps=createMapStatisticsController({statisticsService,onChange:()=>router.refresh()});
  router=createRoutingController({model,mapStatisticsController:maps,detailView:createHeroDetailView(),detailService:{async getHero(){return{detail:normalizeHeroDetail(fixture,'genji'),fetchedAt:'2026-11-04T00:00:00Z'};}}});
  controller=createHeroController({model,view:createHeroView(),service:{async getHeroes(){return{heroes:[{key:'genji',name:'겐지',role:'damage'}]};}},statisticsService,storage:{save(){return true;}},autoRefresh:false,onStateChange:()=>router.refresh()});
  router.start();controller.start();await flush();await flush();assert.equal(calls.length,1);
  const select=document.querySelector('#stats-map');select.focus();select.value='busan';select.dispatchEvent(new window.Event('change',{bubbles:true}));await flush();await flush();
  assert.equal(calls.length,2);assert.equal(document.activeElement.id,'stats-map');assert.equal(document.querySelectorAll('#map-statistics').length,1);
  assert.equal(document.querySelectorAll('#stats-map').length,1);assert.equal(document.querySelector('#hero-map-select'),null);
  assert.deepEqual([...document.querySelectorAll('#statistics-filters select')].map(el=>el.id),['stats-region','stats-division','stats-mode','stats-map']);
  assert.equal(model.state.statsFilters.map,'busan');assert.equal(model.heroByKey('genji').statistics.winRate,40);
  assert.deepEqual([...document.querySelectorAll('#map-statistics dd')].map(x=>x.textContent),['55%','40%','-15.0%p','2%','0%']);
  assert(document.querySelector('.detail-stat-basis').textContent.includes('선택 전장 기준'));
  assert(document.querySelector('[data-favorite="genji"]'));
  location.hash='#/heroes/genji/perks';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();assert(document.querySelector('#detail-map-statistics').hidden);
  location.hash='#heroes';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();
  assert(document.querySelector('#stats-map').closest('#heroes'));assert.equal(document.querySelector('#stats-map').value,'busan');assert.equal(document.querySelector('#stats-map'),select);
 }finally{controller?.stop();router?.stop();dom.window.close();Object.assign(globalThis,prior);}
});
