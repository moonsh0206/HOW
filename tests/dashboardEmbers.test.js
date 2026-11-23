import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createEmberFlight,createDashboardEmbers,emberCapacity} from '../src/views/dashboardEmbers.js';
const seeded=()=>{let n=1543;return ()=>((n=(n*1664525+1013904223)>>>0)/4294967296);};
test('ember flights are warm, varied, finite, fade out and travel once without a return leg',()=>{
 const random=seeded(),flights=Array.from({length:100},(_,i)=>createEmberFlight({x:8,y:300,mobile:i%2===0,edge:i%3===0},random));
 assert.equal(emberCapacity(390),3);assert.equal(emberCapacity(1440),8);assert(new Set(flights.map(f=>f.duration)).size>90);assert(flights.filter(f=>!f.grain).length>75);
 for(const flight of flights){assert(flight.dy<0);assert(flight.duration>=3800&&flight.duration<=8800);assert(flight.length>=1.8&&flight.length<=12);assert.match(flight.core,/^#[a-f0-9]{6}$/);assert.equal(flight.frames[0].opacity,0);assert.equal(flight.frames.at(-1).opacity,0);const ys=flight.frames.map(f=>Number(f.transform.match(/translate3d\([^,]+,([^p]+)px/)[1]));assert(ys.every((y,i)=>!i||y<ys[i-1]));}
});
function setup(){
 const dom=new JSDOM('<section id="dashboard-page"><div id="host"></div></section>',{pretendToBeVisual:true}),doc=dom.window.document,host=doc.querySelector('#host'),media={matches:false,listeners:new Set(),addEventListener(_,f){this.listeners.add(f);},removeEventListener(_,f){this.listeners.delete(f);}};
 dom.window.matchMedia=()=>media;host.getBoundingClientRect=()=>({left:0,top:0,width:1440,height:900});
 const timers=new Map(),animations=[];let id=0;
 dom.window.HTMLElement.prototype.animate=function(frames,options){let finish;const animation={frames,options,finished:new Promise(resolve=>finish=resolve),cancelled:false,cancel(){this.cancelled=true;},finish(){finish();}};animations.push(animation);return animation;};
 const mount=()=>createDashboardEmbers(host,{random:seeded(),setTimer(fn){timers.set(++id,fn);return id;},clearTimer(id){timers.delete(id);}});
 const tick=()=>{const next=timers.entries().next().value;if(next){timers.delete(next[0]);next[1]();}};
 return {dom,doc,host,media,timers,animations,mount,tick};
}
test('one irregular scheduler caps density, removes expired particles and resamples new lifetimes',async()=>{
 const app=setup(),effect=app.mount();try{effect.setActive(true);assert.equal(app.timers.size,1);for(let i=0;i<30;i++)app.tick();assert.equal(app.host.querySelectorAll('.dashboard-ember').length,8);assert(app.animations.every(a=>a.options.iterations===1));
 const old=app.host.querySelector('.dashboard-ember').dataset.emberId;app.animations[0].finish();await Promise.resolve();assert.equal(app.host.querySelectorAll('.dashboard-ember').length,7);app.tick();assert.equal(app.host.querySelectorAll('.dashboard-ember').length,8);assert(![...app.host.querySelectorAll('.dashboard-ember')].some(e=>e.dataset.emberId===old));
 app.dom.window.innerWidth=390;app.dom.window.dispatchEvent(new app.dom.window.Event('resize'));assert.equal(app.host.querySelectorAll('.dashboard-ember').length,3);
 }finally{effect.destroy();assert.equal(app.timers.size,0);app.dom.window.close();}
});
test('inactive route, hidden tab, reduced motion and duplicate mounts release timers/particles/listeners',()=>{
 const app=setup();let effect=app.mount();try{effect.setActive(true);app.tick();effect.setActive(false);assert.equal(app.timers.size,0);assert.equal(app.host.querySelectorAll('.dashboard-ember').length,0);
 effect.setActive(true);app.tick();Object.defineProperty(app.doc,'hidden',{configurable:true,value:true});app.doc.dispatchEvent(new app.dom.window.Event('visibilitychange'));assert.equal(app.timers.size,0);assert.equal(app.host.querySelectorAll('.dashboard-ember').length,0);
 Object.defineProperty(app.doc,'hidden',{configurable:true,value:false});app.doc.dispatchEvent(new app.dom.window.Event('visibilitychange'));assert.equal(app.timers.size,1);
 app.media.matches=true;app.media.listeners.forEach(f=>f());assert.equal(app.timers.size,0);app.media.matches=false;app.media.listeners.forEach(f=>f());app.tick();assert(app.host.querySelector('.dashboard-ember'));
 effect=app.mount();assert.equal(app.host.querySelectorAll('.dashboard-embers').length,1);assert.equal(app.media.listeners.size,1);assert.equal(app.timers.size,0);effect.setActive(true);assert.equal(app.timers.size,1);
 }finally{effect.destroy();effect.destroy();assert.equal(app.media.listeners.size,0);assert.equal(app.timers.size,0);assert.equal(app.host.children.length,0);app.dom.window.close();}
});
test('unsupported animation environment keeps a static background without starting timers',()=>{
 const dom=new JSDOM('<div id="host"/>'),host=dom.window.document.querySelector('#host');let scheduled=0;const effect=createDashboardEmbers(host,{setTimer(){scheduled++;}});effect.setActive(true);assert.equal(scheduled,0);effect.destroy();dom.window.close();
});
