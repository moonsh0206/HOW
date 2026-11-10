import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {topPlayerHeroes,formatPlayerTime} from '../src/models/playerModel.js';
import {playerRankImage,renderPlayerRank} from '../src/views/playerRankView.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {parseRoute} from '../src/controllers/routingController.js';
test('player profile hash roundtrip keeps opaque IDs, rejects invalid paths, and preserves hero routes',()=>{
 for(const id of ['TeKrop-2217','abc%7Cdef','한글-1234'])assert.deepEqual(parseRoute('#/players/'+encodeURIComponent(id)),{page:'player',id});
 for(const path of ['#/players/%ZZ','#/players/%252Fadmin','#/players/a/b'])assert.equal(parseRoute(path).page,'not-found');
 assert.deepEqual(parseRoute('#/heroes/genji/perks'),{page:'detail',key:'genji',tab:'perks'});
});
test('competitive most hero, stable sorting, true ratios, missing and zero time do not invent bars',()=>{
 const raw={heroes:[{key:'ana',seconds:90,played:1},{key:'baptiste',seconds:180},{key:'kiriko',seconds:0},{key:'mercy',seconds:null}]},before=JSON.stringify(raw);
 const top=topPlayerHeroes(raw,[{key:'ana',name:'아나',role:'support'}]);assert.equal(top.most.key,'baptiste');assert.deepEqual(top.heroes.map(h=>h.barPercent),[100,50,0,null]);assert.equal(top.heroes[1].name,'아나');assert.equal(top.heroes[1].role,'support');assert.equal(JSON.stringify(raw),before);
 assert.equal(topPlayerHeroes({heroes:[{key:'ana',seconds:0}]}).most,null);assert.equal(topPlayerHeroes({heroes:[{key:'ana',seconds:0}]}).heroes[0].barPercent,null);assert.equal(topPlayerHeroes(null).heroes.length,0);
 assert.equal(formatPlayerTime(3661),'1시간 1분 1초');assert.equal(formatPlayerTime(null),'정보 없음');
});
test('local rank mappings include emerald and champion, unknown/unplaced has text fallback',()=>{
 const old=globalThis.document,dom=new JSDOM();globalThis.document=dom.window.document;
 try{for(const key of ['bronze','silver','gold','platinum','emerald','diamond','master','grandmaster'])assert(playerRankImage(key).endsWith('/'+key+'.png'));assert(playerRankImage('ultimate').endsWith('/champion.png'));assert.equal(playerRankImage('unranked'),null);
 const rank=renderPlayerRank({division:'silver',tier:4,platform:'pc',season:22});assert.match(rank.textContent,/실버 4/);rank.querySelector('img').dispatchEvent(new dom.window.Event('error'));assert.equal(rank.querySelector('img'),null);assert.match(rank.textContent,/실버 4/);
 }finally{dom.window.close();globalThis.document=old;}
});
test('direct player route does not re-search; background uses most competitive hero and cannot overwrite a newer profile',async()=>{
 const old=globalThis.document,dom=new JSDOM('<section></section>');globalThis.document=dom.window.document;
 try{let searchCalls=0,backgroundResolve;const c=createPlayerSearchController({root:document.querySelector('section'),provider:{search:async()=>{searchCalls++;},summary:async id=>({data:{name:id,ranks:[]},fetchedAt:new Date().toISOString()}),competitive:async id=>({data:{general:null,heroes:[{key:id==='A-1234'?'ana':'baptiste',seconds:100}]},fetchedAt:new Date().toISOString()})},heroDetails:{getHero:key=>key==='ana'?new Promise(r=>backgroundResolve=r):Promise.resolve({detail:{backgrounds:[{url:'https://example.com/baptiste.jpg',sizes:['xl+']}]}})}});
 c.setActive(true);c.setRoute('A-1234');await new Promise(r=>setImmediate(r));c.setRoute('B-1234');await new Promise(r=>setImmediate(r));assert.equal(searchCalls,0);assert.equal(c.state.selected.id,'B-1234');assert.equal(c.state.background,'https://example.com/baptiste.jpg');backgroundResolve({detail:{backgrounds:[{url:'https://example.com/ana.jpg'}]}});await new Promise(r=>setImmediate(r));assert.equal(c.state.background,'https://example.com/baptiste.jpg');assert.equal(document.querySelector('#player-search-form').hidden,true);c.setRoute(null);assert.equal(document.querySelector('#player-search-form').hidden,false);c.stop();
 }finally{dom.window.close();globalThis.document=old;}
});

test('multiple result links carry distinct original IDs and open their own profile without another search',async()=>{
 const old=globalThis.document,dom=new JSDOM('<section></section>');globalThis.document=dom.window.document;
 try{const navigated=[],calls=[];let searches=0;const c=createPlayerSearchController({root:document.querySelector('section'),onNavigate:id=>navigated.push(id),provider:{search:async()=>{searches++;return {data:{total:2,players:[{id:'One-1234',name:'One',isPublic:true},{id:'abc%7Cdef',name:'Two',isPublic:true}]}};},summary:async id=>{calls.push(id);return {data:{name:id,ranks:[]},fetchedAt:new Date().toISOString()};},competitive:async()=>({data:{general:null,heroes:[]},fetchedAt:new Date().toISOString()})}});
 c.setActive(true);await c.search('test');for(const id of c.state.results.map(p=>p.id)){const link=[...document.querySelectorAll('[data-player-id]')].find(a=>a.dataset.playerId===id);assert.equal(parseRoute(link.getAttribute('href')).id,id);link.click();assert.equal(navigated.at(-1),id);c.setRoute(id);await new Promise(r=>setImmediate(r));assert.equal(document.querySelector('#player-profile h2').textContent,id);c.setRoute(null);}assert.deepEqual(calls,['One-1234','abc%7Cdef']);assert.equal(searches,1);c.stop();
 }finally{dom.window.close();globalThis.document=old;}
});
