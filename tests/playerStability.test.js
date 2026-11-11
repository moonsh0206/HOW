import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createOverfastPlayerProvider} from '../src/services/overfastPlayerProvider.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {createPlayerFavoritesStorage} from '../src/storage/playerFavoritesStorage.js';
const reply=(data,status=200,headers={})=>({ok:status===200,status,headers:new Headers(headers),json:async()=>data});
const summary={username:'Public',competitive:{pc:{season:22,support:{division:'silver',tier:4}}}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('expired provider cache is labeled stale and reused for only 30 seconds to avoid repeated stale fetches',async()=>{
 let clock=0,calls=0;const p=createOverfastPlayerProvider({now:()=>clock,fetcher:async()=>{calls++;return reply(summary,200,{age:'723','x-cache-ttl':'600'});}});
 assert.equal((await p.summary('Public-1234')).providerStale,true);const cached=await p.summary('Public-1234');assert.equal(cached.cached,true);assert.equal(cached.providerStale,true);assert.equal(calls,1);clock=30001;await p.summary('Public-1234');assert.equal(calls,2);
});
test('detail retries one transient request, shares attempts, respects Retry-After and does not retry private/429',async()=>{
 for(const status of [503,504,500]){let calls=0,waits=0;const p=createOverfastPlayerProvider({wait:async()=>waits++,fetcher:async()=>++calls===1?reply({},status):reply(summary)});
  const a=p.summary('Public-1234',{retry:true}),b=p.summary('Public-1234',{retry:true});assert.equal(a,b);await a;assert.equal(calls,2);assert.equal(waits,1);assert.equal((await p.summary('Public-1234')).cached,true);
 }
 for(const status of [403,429,503]){let calls=0;const p=createOverfastPlayerProvider({wait:async()=>assert.fail('must not retry'),fetcher:async()=>{calls++;return reply({},status,{'retry-after':'60'});}});await assert.rejects(p.summary('Public-1234',{retry:true}));await assert.rejects(p.summary('Public-1234',{retry:true}));assert.equal(calls,1);}
 let calls=0;const p=createOverfastPlayerProvider({timeoutMs:5,wait:async()=>{},fetcher:(_,{signal})=>{calls++;return calls===1?new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')))):Promise.resolve(reply(summary));}});await p.summary('Public-1234',{retry:true});assert.equal(calls,2);
 let failed=0;const f=createOverfastPlayerProvider({wait:async()=>{},fetcher:async()=>{failed++;return reply({},504);}});await assert.rejects(f.summary('Public-1234',{retry:true}));assert.equal(failed,2);
});
test('foreground detail can request bounded retry while sharing an already pending card summary',async()=>{
 let finish,calls=0;const p=createOverfastPlayerProvider({wait:async()=>{},fetcher:async()=>{calls++;return calls===1?new Promise(resolve=>finish=resolve):reply(summary);}});
 const card=p.summary('Public-1234');await Promise.resolve();const detail=p.summary('Public-1234',{retry:true});assert.equal(card,detail);finish(reply({},503));await detail;assert.equal(calls,2);
});
test('slow/failed summary cannot block successful competitive data; previous favorite ranks survive reload and failures',async()=>{
 const dom=new JSDOM('<section></section>',{url:'https://example.com'}),old=globalThis.document;globalThis.document=dom.window.document;
 try{const storage=createPlayerFavoritesStorage(()=>dom.window.localStorage);storage.save([{id:'Public-1234',name:'Saved',isPublic:true,profile:{data:{name:'Saved',ranks:[{platform:'pc',role:'support',division:'silver',tier:4,season:22}]},fetchedAt:'2026-11-01T00:00:00Z'}}]);let failSummary,statsCalls=0;
  const c=createPlayerSearchController({root:document.querySelector('section'),favoritesStorage:storage,provider:{summary:()=>new Promise((_,reject)=>failSummary=reject),competitive:async()=>{statsCalls++;return {data:{general:{seconds:12,played:1},heroes:[]},fetchedAt:'2026-11-11T00:00:00Z'};}}});c.setActive(true);const pending=c.select('Public-1234');await tick();assert.equal(statsCalls,1);assert.equal(c.state.competitiveStatus,'ready');assert.equal(c.state.summaryStatus,'loading');assert.match(document.querySelector('#player-profile').textContent,/12초/);assert.match(document.querySelector('#player-profile').textContent,/이전 조회 정보/);failSummary(Error('timeout'));await pending;assert.equal(c.state.competitiveStatus,'ready');assert.equal(c.state.summaryStatus,'error');assert.equal(c.state.summary.data.name,'Saved');assert.equal(storage.load().players.length,1);assert.equal(storage.load().players[0].profile.data.ranks[0].tier,4);c.stop();
 }finally{globalThis.document=old;dom.window.close();}
});
