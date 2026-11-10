import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {playerQuery,playerPath,normalizePlayerSearch,normalizePlayerSummary,normalizePlayerStats} from '../src/models/playerModel.js';
import {createOverfastPlayerProvider,PlayerLookupError} from '../src/services/overfastPlayerProvider.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
const read=async file=>JSON.parse(await fs.readFile(new URL('../docs/qa/player-search/'+file+'.json',import.meta.url),'utf8'));
const captured=await read('search'),summary=await read('summary'),stats=await read('competitive');
const reply=(data,status=200,headers={})=>({ok:status===200,status,headers:new Headers(headers),json:async()=>structuredClone(data)});
test('player input, canonical encoded identifiers, null/zero and captured public account schema',()=>{
 assert.equal(playerQuery(' TeKrop#2217 '),'TeKrop-2217');assert.equal(playerQuery('한글닉네임'),'한글닉네임');
 for(const v of ['', '<script>', 'x#oops', '../x','a\nb'])assert.throws(()=>playerQuery(v));
 assert.equal(playerPath('abc%7Cdef'),'abc%7Cdef');assert.throws(()=>playerPath('%2Fadmin'));assert.throws(()=>playerPath('%invalid'));
 const results=normalizePlayerSearch(captured);assert.equal(results.players[0].name,'TeKrop');assert.equal(results.players[0].isPublic,true);
 assert.deepEqual(normalizePlayerSearch({total:0,results:[]}),{total:0,players:[]});
 assert.equal(normalizePlayerSummary(summary).ranks[0].season,22);const normalized=normalizePlayerStats(stats);assert.equal(normalized.general.seconds,12164);assert.equal(normalized.general.played,19);assert.equal(normalized.heroes.find(h=>h.key==='kiriko').winRate,0);assert.equal(normalized.heroes.find(h=>h.key==='kiriko').played,0);
 assert.equal(normalizePlayerStats({general:{},heroes:null}).general.played,null);assert.throws(()=>normalizePlayerStats([]));
});
test('player provider deduplicates, respects Age/TTL, preserves identifier case and maps BattleTag search',async()=>{
 let count=0,clock=0,finish,urls=[];const provider=createOverfastPlayerProvider({now:()=>clock,fetcher:async url=>{urls.push(url);count++;return new Promise(r=>finish=()=>r(reply(captured,200,{age:'20','x-cache-ttl':'600'})));}});
 const a=provider.search('TeKrop#2217'),b=provider.search('TeKrop#2217');assert.equal(a,b);await Promise.resolve();finish();await a;assert.equal(count,1);assert.equal(new URL(urls[0]).searchParams.get('name'),'TeKrop-2217');assert.equal((await provider.search('TeKrop#2217')).cached,true);
 clock=580001;const c=provider.search('TeKrop#2217');await Promise.resolve();finish();await c;assert.equal(count,2);
});
test('player HTTP errors, private, timeout, network, malformed response and retry cooldown are distinct',async()=>{
 for(const [status,code]of [[403,'private'],[404,'not-found'],[429,'rate-limit'],[503,'upstream-limit'],[500,'server'],[504,'server']]){
  let calls=0;const p=createOverfastPlayerProvider({fetcher:async()=>{calls++;return reply({},status,{'retry-after':'30'});}});await assert.rejects(p.summary('Test-1234'),e=>e.code===code&&e.retryAt>Date.now());await assert.rejects(p.summary('Test-1234'));assert.equal(calls,1);
 }
 const timeout=createOverfastPlayerProvider({timeoutMs:5,fetcher:(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))});await assert.rejects(timeout.summary('Test-1234'),e=>e.code==='timeout');
 await assert.rejects(createOverfastPlayerProvider({fetcher:async()=>{throw new TypeError('offline');}}).summary('Test-1234'),e=>e.code==='network');
 await assert.rejects(createOverfastPlayerProvider({fetcher:async()=>reply({})}).summary('Test-1234'),e=>e.code==='invalid');
});
async function withDOM(run){const dom=new JSDOM('<section id="player-search-page"></section>'),old=globalThis.document;globalThis.document=dom.window.document;try{await run(dom.window.document.querySelector('section'));}finally{dom.window.close();globalThis.document=old;}}
test('player controller ignores older searches/profiles and responses after leaving; no eager provider requests',()=>withDOM(async root=>{
 const searchTasks=[],summaryTasks=[];let calls=0;
 const controller=createPlayerSearchController({root,provider:{search:q=>{calls++;return new Promise(resolve=>searchTasks.push({q,resolve}));},summary:id=>new Promise(resolve=>summaryTasks.push({id,resolve})),competitive:async()=>({data:normalizePlayerStats(stats),fetchedAt:new Date().toISOString()})}});
 controller.setActive(true);assert.equal(calls,0);
 const a=controller.search('old'),b=controller.search('new');searchTasks[1].resolve({data:{total:2,players:[{id:'New-1234',name:'New',isPublic:true},{id:'Old-1234',name:'Old',isPublic:true}]}});await b;searchTasks[0].resolve({data:{total:0,players:[]}});await a;assert.equal(controller.state.results.length,2);
 const x=controller.select('Old-1234'),y=controller.select('New-1234');summaryTasks[1].resolve({data:normalizePlayerSummary(summary),fetchedAt:new Date().toISOString()});await y;summaryTasks[0].resolve({data:{name:'Wrong'},fetchedAt:new Date().toISOString()});await x;assert.equal(controller.state.selected.id,'New-1234');assert.equal(root.querySelector('#player-profile h2').textContent,'TeKrop');
 const leave=controller.search('leave');controller.setActive(false);searchTasks[2].resolve({data:{total:0,players:[]}});await leave;assert.equal(controller.state.results.length,0);controller.stop();
}));
test('private profiles skip stats; captured rates render safely with multiple results and provider isolation',()=>withDOM(async root=>{
 let statsCalls=0;const frame=data=>({data,fetchedAt:new Date().toISOString(),providerAgeSeconds:0});
 const p={search:async()=>frame({total:2,players:[{id:'Private-1234',name:'<img onerror=x>',isPublic:false},{...normalizePlayerSearch(captured).players[0]}]}),summary:async()=>frame(normalizePlayerSummary(summary)),competitive:async()=>{statsCalls++;return frame(normalizePlayerStats(stats));}};
 const c=createPlayerSearchController({root,provider:p});c.setActive(true);await c.search('TeKrop');assert.equal(root.querySelectorAll('#player-results [data-player-id]').length,2);assert.equal(root.querySelector('img[onerror]'),null);
 await c.select('Private-1234');assert.equal(statsCalls,0);assert.match(root.querySelector('#player-profile').textContent,/비공개/);
 await c.select(c.state.results[1].id);assert.equal(statsCalls,1);assert.match(root.querySelector('#player-profile').textContent,/19경기/);assert.match(root.querySelector('#player-profile').textContent,/31.58%/);assert.equal(root.querySelectorAll('.player-hero-stats li').length,5);c.setActive(false);c.setActive(true);assert.equal(statsCalls,1);c.stop();
}));
