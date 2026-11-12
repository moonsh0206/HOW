import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createOverfastPlayerProvider} from '../src/services/overfastPlayerProvider.js';
import {revealResults} from '../src/views/contentMotion.js';
const response=data=>({ok:true,headers:new Headers(),json:async()=>data});
const player=(id,name)=>({player_id:id,name,is_public:true});
test('verified case spelling fallback shares cache, preserves opaque IDs and same-name accounts',async()=>{
 const calls=[];const provider=createOverfastPlayerProvider({fetcher:async url=>{const name=new URL(url).searchParams.get('name');calls.push(name);return response(name==='TeKrop'?{total:2,results:[player('MiXeD-1234','TeKrop'),player('Other-5678','TeKrop')]}:{total:0,results:[]});}});
 await provider.search('TeKrop');
 for(const name of ['tekrop','TEKROP']){const frame=await provider.search(name);assert.deepEqual(frame.data.players.map(p=>p.id),['MiXeD-1234','Other-5678']);assert.equal(frame.data.players[0].name,'TeKrop');assert.equal(frame.searchSpelling,'TeKrop');assert.equal(frame.cached,true);}
 assert.deepEqual(calls,['TeKrop','tekrop','TEKROP']);
 await provider.search('tekrop');assert.equal(calls.length,3);
});
test('unknown and ambiguous spellings are not guessed; exact matches always win; favorite seeds bounded fallback',async()=>{
 const calls=[];const provider=createOverfastPlayerProvider({fetcher:async url=>{const name=new URL(url).searchParams.get('name');calls.push(name);return response({total:name==='Exact'?1:0,results:name==='Exact'?[player('ExAcT-ID','Exact')]:[]});}});
 assert.equal((await provider.search('unknown')).data.total,0);assert.deepEqual(calls,['unknown']);
 provider.rememberPlayers([{name:'TeKrop'},{name:'TEKROP'}]);assert.equal((await provider.search('tekrop')).data.total,0);assert.deepEqual(calls,['unknown','tekrop']);
 provider.rememberPlayers([{name:'EXACT'}]);assert.equal((await provider.search('Exact')).data.players[0].id,'ExAcT-ID');
 const seeded=createOverfastPlayerProvider({fetcher:async url=>response(new URL(url).searchParams.get('name')==='TeKrop'?{total:1,results:[player('OriginalID','TeKrop')]}:{total:0,results:[]})});seeded.rememberPlayers([{id:'OriginalID',name:'TeKrop'}]);assert.equal((await seeded.search('tekrop')).data.players[0].id,'OriginalID');
});
test('upstream errors never trigger spelling guesses or ID changes',async()=>{
 let calls=0;const provider=createOverfastPlayerProvider({fetcher:async()=>{calls++;return {ok:false,status:429,headers:new Headers({'retry-after':'5'}),json:async()=>({})};}});provider.rememberPlayers([{name:'TeKrop'}]);await assert.rejects(provider.search('tekrop'),e=>e.code==='rate-limit');assert.equal(calls,1);
});
test('result reveal only runs on changed IDs and honors reduced-motion without layout/focus changes',()=>{
 const dom=new JSDOM('<ul></ul>'),node=dom.window.document.querySelector('ul');let reduced=false,calls=0,cancels=0;
 dom.window.matchMedia=()=>({matches:reduced});node.animate=()=>{calls++;return {cancel(){cancels++;}};};
 revealResults(node,'a');revealResults(node,'a');assert.equal(calls,1);
 revealResults(node,'b');assert.equal(calls,2);assert.equal(cancels,1);
 reduced=true;revealResults(node,'c');assert.equal(calls,2);assert.equal(cancels,2);revealResults(node,'');assert.equal(calls,2);dom.window.close();
});
