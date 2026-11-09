import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createRoutingController} from '../src/controllers/routingController.js';
import {createHeroModel} from '../src/models/heroModel.js';

const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
async function setup(hash,run){
 const dom=new JSDOM(html,{url:'https://example.test/HOW/'+hash}),prior={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
 let y=900,id=0,router;const frames=new Map(),calls=[],pending=new Map();
 Object.defineProperty(window,'scrollY',{get:()=>y});window.history.scrollRestoration='auto';window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};window.cancelAnimationFrame=key=>frames.delete(key);window.scrollTo=options=>{y=options.top;calls.push(options);window.dispatchEvent(new window.Event('scroll'));};
 const frame=()=>{const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn());};
 const go=next=>{window.history.replaceState(null,'',next);window.dispatchEvent(new window.HashChangeEvent('hashchange'));};
 const finish=async key=>{pending.get(key)?.({detail:{key,minor:[],major:[]},fetchedAt:'2026-11-09T00:00:00Z'});await new Promise(r=>setImmediate(r));};
 try{
  router=createRoutingController({model:createHeroModel(),detailService:{getHero:key=>new Promise(r=>pending.set(key,r))},detailView:{render(){},focusHeading(){}}});router.start();
  await run({router,calls,frames,frame,go,finish,top:()=>y,setTop(value){y=value;window.dispatchEvent(new window.Event('scroll'));}});
 }finally{router?.stop();assert.equal(window.history.scrollRestoration,'auto');assert.equal(frames.size,0);dom.window.close();Object.assign(globalThis,prior);}
}

test('new hero resets after render once; tabs/API refresh retain scroll; original list restores and stale frames cancel',async()=>setup('#/tiers',async app=>{
 app.frame();app.calls.length=0;app.setTop(1200);
 app.go('#/heroes/genji');assert.equal(app.frames.size,1);app.frame();assert.equal(app.top(),0);assert.equal(app.calls.length,1);
 app.setTop(450);await app.finish('genji');assert.equal(app.top(),450);assert.equal(app.calls.length,1);
 for(const tab of ['abilities','perks','overview']){app.go('#/heroes/genji/'+tab);app.frame();app.router.refresh();assert.equal(app.top(),450);assert.equal(app.calls.length,1);}
 app.go('#/heroes/ana');app.frame();assert.equal(app.top(),0);assert.equal(app.calls.length,2);await app.finish('ana');
 app.go('#/tiers');app.frame();assert.equal(app.top(),1200);
 app.go('#/heroes/genji');app.go('#/meta');assert.equal(app.frames.size,1);app.frame();assert.equal(app.top(),0);await app.finish('genji');assert.equal(document.querySelector('#hero-detail-page').hidden,true);
 assert(app.calls.every(c=>c.left===0&&c.behavior==='instant'));
}));

test('direct detail URL/reload starts at top; stopping removes a queued navigation reset',async()=>setup('#/heroes/genji/perks',async app=>{
 assert.equal(window.history.scrollRestoration,'manual');app.frame();assert.equal(app.top(),0);await app.finish('genji');assert.equal(app.calls.length,1);
 app.setTop(600);app.go('#/heroes/ana');app.router.stop();app.frame();assert.equal(app.top(),600);assert.equal(app.calls.length,1);
}));
