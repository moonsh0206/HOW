import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {PLAYER_HERO_COLORS,playerHeroColor,DEFAULT_PLAYER_HERO_COLOR} from '../src/data/playerHeroColors.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {createOverfastPlayerProvider} from '../src/services/overfastPlayerProvider.js';
const read=async path=>JSON.parse(await fs.readFile(new URL(path,import.meta.url),'utf8'));
const summary=await read('../docs/qa/player-search/summary.json'),search=await read('../docs/qa/player-search/search.json'),stats=await read('../docs/qa/player-search/competitive.json');
const tick=()=>new Promise(r=>setImmediate(r));
async function domTest(run){const dom=new JSDOM('<section></section>'),old=globalThis.document;globalThis.document=dom.window.document;try{await run(document.querySelector('section'));}finally{dom.window.close();globalThis.document=old;}}
test('hero colors cover the actual roster and are fixed per hero with safe unknown fallback',async()=>{
 const heroes=await read('./fixtures/overfast-heroes.json');assert.equal(heroes.length,54);for(const h of heroes){assert.match(PLAYER_HERO_COLORS[h.key],/^#[0-9a-f]{6}$/i);assert.equal(playerHeroColor(h.key),playerHeroColor(h.key));}
 assert.notEqual(playerHeroColor('ana'),playerHeroColor('baptiste'));assert.equal(playerHeroColor('new-hero'),DEFAULT_PLAYER_HERO_COLOR);assert.equal(playerHeroColor('__proto__'),DEFAULT_PLAYER_HERO_COLOR);
});
test('card IDs stay in routes, same-name players remain distinct, rank failure keeps navigation and private cards do not fetch',()=>domTest(async root=>{
 const navigated=[],calls=[];const c=createPlayerSearchController({root,onNavigate:id=>navigated.push(id),provider:{search:async()=>({data:{total:3,players:[{id:'One-1234',name:'Same',isPublic:true},{id:'Two-5678',name:'Same',isPublic:true},{id:'Private-1234',name:'Private',isPublic:false}]}}),summary:async id=>{calls.push(id);throw Error('offline');}}});c.setActive(true);await c.search('Same');
 assert(!root.querySelector('#player-results').textContent.includes('One-1234'));const links=[...root.querySelectorAll('[data-player-id]')];assert.equal(new Set(links.map(a=>a.href)).size,3);assert(links.every(a=>a.textContent.includes('→')));
 c.loadCard('Private-1234');c.loadCard('One-1234');await tick();assert.deepEqual(calls,['One-1234']);assert.match(root.querySelector('[data-player-id="One-1234"]').textContent,/조회 불가/);links[1].click();assert.deepEqual(navigated,['Two-5678']);c.stop();
}));
test('visible rank queue has max two simultaneous calls and 20 attempts, ignoring earlier query responses',()=>domTest(async root=>{
 let active=0,max=0;const tasks=[];const players=Array.from({length:25},(_,i)=>({id:`P-${1000+i}`,name:'Player',isPublic:true}));
 const c=createPlayerSearchController({root,provider:{search:async()=>({data:{total:25,players}}),summary:id=>{active++;max=Math.max(max,active);return new Promise(resolve=>tasks.push(()=>{active--;resolve({data:{ranks:[]}});}));}}});c.setActive(true);await c.search('Player');assert.equal(tasks.length,0);for(const p of players)c.loadCard(p.id);await tick();assert.equal(tasks.length,2);
 let done=0;while(done<20){const available=tasks.length;for(;done<available;done++)tasks[done]();await tick();}assert.equal(tasks.length,20);assert.equal(max,2);
 await c.search('Other');c.loadCard(players[0].id);await tick();await c.search('New');tasks[20]();await tick();assert.equal(c.state.cardProfiles.size,0);c.stop();
}));
test('card rank summary and selected profile share Provider cache; rate limiting stops queued prefetch',()=>domTest(async root=>{
 const calls=[];const p=createOverfastPlayerProvider({fetcher:async url=>{calls.push(url);return {ok:true,status:200,headers:new Headers({'x-cache-ttl':'600'}),json:async()=>structuredClone(url.includes('/stats/summary')?stats:url.includes('/summary')?summary:search)};}});
 const c=createPlayerSearchController({root,provider:p});c.setActive(true);await c.search('TeKrop');const id=c.state.results[0].id;c.loadCard(id);await tick();await tick();assert.equal(root.querySelectorAll('.player-card-ranks img').length,1);assert.match(root.querySelector('.player-card-ranks').textContent,/실버 4/);await c.select(id);assert.equal(calls.filter(u=>u.endsWith('/summary')&&!u.includes('/stats/')).length,1);assert.equal(calls.length,3);c.stop();
 const blocked=createPlayerSearchController({root,provider:{search:async()=>({data:{total:4,players:Array.from({length:4},(_,i)=>({id:`R-${1234+i}`,name:'R'}))}}),summary:async()=>{throw Object.assign(Error('limit'),{code:'rate-limit'});}}});blocked.setActive(true);await blocked.search('R');blocked.state.results.forEach(p=>blocked.loadCard(p.id));await tick();assert(blocked.state.results.every(p=>blocked.state.cardProfiles.get(p.id)?.status==='error'));blocked.stop();
}));
