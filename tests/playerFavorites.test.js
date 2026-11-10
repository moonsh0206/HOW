import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createPlayerFavoritesStorage,PLAYER_FAVORITES_KEY} from '../src/storage/playerFavoritesStorage.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {createRoutingController} from '../src/controllers/routingController.js';
import {createHeroModel} from '../src/models/heroModel.js';
const tick=()=>new Promise(r=>setImmediate(r));
const player={id:'abc%7Cdef',name:'Same',avatar:'https://example.com/avatar.png',isPublic:true};
async function withDOM(html,run){const dom=new JSDOM(html,{url:'https://example.com/HOW/#/player-search'}),old={document:globalThis.document,window:globalThis.window,location:globalThis.location};Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});try{await run(dom.window);}finally{dom.window.close();Object.assign(globalThis,old);}}
test('player favorite storage preserves IDs, deduplicates, validates safely and leaves hero favorites untouched',()=>withDOM('<section></section>',window=>{
 window.localStorage.setItem('how:favorites:v1','["ana"]');const storage=createPlayerFavoritesStorage(()=>window.localStorage);
 assert(storage.save([player,player,{...player,id:'Other-1234'},{id:'%2Fbad',name:'bad'}]));const saved=storage.load();assert.equal(saved.players.length,2);assert.equal(saved.players[0].id,player.id);assert.equal(window.localStorage.getItem('how:favorites:v1'),'["ana"]');
 assert.equal(createPlayerFavoritesStorage(()=>window.localStorage).load().players.length,2);storage.save([]);assert.equal(storage.load().players.length,0);
 window.localStorage.setItem(PLAYER_FAVORITES_KEY,'bad JSON');assert.equal(storage.load().available,false);assert.equal(createPlayerFavoritesStorage(()=>{throw Error();}).save([player]),false);
}));
test('favorite button is outside the card link, toggles immediately, initial list survives failed API and recreation',()=>withDOM('<section></section>',async window=>{
 const root=document.querySelector('section'),storage=createPlayerFavoritesStorage(()=>window.localStorage);let navigated=0;
 const provider={search:async()=>({data:{total:1,players:[player]}}),summary:async()=>{throw Error('offline');}};
 let c=createPlayerSearchController({root,provider,favoritesStorage:storage,onNavigate:()=>navigated++});c.setActive(true);await c.search('Same');let star=root.querySelector('[data-player-favorite]');assert.equal(star.closest('a'),null);star.click();assert.equal(navigated,0);assert.equal(root.querySelector('[data-player-favorite]').textContent,'★');assert.equal(storage.load().players[0].id,player.id);
 c.reset();assert.equal(root.querySelector('.player-favorites-title').hidden,false);assert.equal(root.querySelectorAll('[data-player-id]').length,1);c.loadCard(player.id);await tick();assert.equal(storage.load().players.length,1);root.querySelector('[data-player-id]').click();assert.equal(navigated,1);c.stop();
 c=createPlayerSearchController({root,provider,favoritesStorage:storage});c.setActive(true);assert.equal(root.querySelector('[data-player-favorite]').getAttribute('aria-pressed'),'true');root.querySelector('[data-player-favorite]').click();assert.equal(storage.load().players.length,0);assert.equal(root.querySelectorAll('[data-player-id]').length,0);c.stop();
}));
test('reset invalidates in-flight search and profile, clears transient state but retains favorites',()=>withDOM('<section></section>',async window=>{
 const storage=createPlayerFavoritesStorage(()=>window.localStorage);storage.save([player]);let finishSearch,finishSummary;
 const c=createPlayerSearchController({root:document.querySelector('section'),favoritesStorage:storage,provider:{search:()=>new Promise(r=>finishSearch=r),summary:()=>new Promise(r=>finishSummary=r)}});c.setActive(true);const search=c.search('slow');c.reset();finishSearch({data:{total:1,players:[{...player,id:'Old-1234'}]}});await search;assert.equal(c.state.searchStatus,'idle');assert.equal(c.state.results.length,0);assert.equal(c.state.favorites.size,1);
 const profile=c.select(player.id);c.reset();finishSummary({data:{name:'Late',ranks:[]}});await profile;assert.equal(c.state.selected,null);assert.equal(c.state.summary,null);assert.equal(c.state.total,0);assert.equal(c.state.private,false);c.stop();
}));
test('zero results only show original illustration and real text; search-again clears and focuses input, errors do not show illustration',()=>withDOM('<section></section>',async()=>{
 const c=createPlayerSearchController({root:document.querySelector('section'),provider:{search:async()=>({data:{total:0,players:[]}})}});c.setActive(true);await c.search('NoPlayer');const empty=document.querySelector('.player-search-empty');assert.equal(empty.hidden,false);assert.match(empty.querySelector('img').src,/HOW_kinetic_grasp_clean\.png$/);assert.equal(empty.querySelector('h2').textContent,'해당 계정을 찾을 수 없습니다');document.querySelector('#player-query').value='NoPlayer';document.querySelector('[data-player-search-again]').click();assert.equal(empty.hidden,true);assert.equal(document.activeElement.id,'player-query');assert.equal(document.querySelector('#player-query').value,'');c.stop();
 const bad=createPlayerSearchController({root:document.querySelector('section'),provider:{search:async()=>{throw Error('network');}}});bad.setActive(true);await bad.search('Error');assert.equal(empty.hidden,true);assert.equal(bad.state.searchStatus,'error');bad.stop();
}));
test('top player menu resets even on the same hash, but profile back link retains the search',async()=>{
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');return withDOM(html,async window=>{
  window.scrollTo=()=>{};const router=createRoutingController({model:createHeroModel(),detailService:{},detailView:{},playerProvider:{search:async()=>({data:{total:1,players:[player]}}),summary:async()=>({data:{name:'Same',ranks:[]},fetchedAt:new Date().toISOString()}),competitive:async()=>({data:{general:null,heroes:[]},fetchedAt:new Date().toISOString()})}});router.start();
  const input=document.querySelector('#player-query');input.value='Same';document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(document.querySelectorAll('[data-player-id]').length,1);
  document.querySelector('[data-main-menu="player-search"]').click();assert.equal(input.value,'');assert.equal(document.querySelectorAll('[data-player-id]').length,0);assert.match(document.querySelector('#player-search-status').textContent,/입력/);router.stop();
 });
});
