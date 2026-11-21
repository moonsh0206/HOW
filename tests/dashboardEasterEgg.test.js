import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {DASHBOARD_EGGS,pickDashboardEgg} from '../src/data/dashboardEggs.js';
import {createDashboardEasterEgg} from '../src/views/dashboardEasterEgg.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('five existing assets occupy equal probability intervals and allow identical consecutive choices',()=>{
 const counts=new Map(DASHBOARD_EGGS.map(item=>[item.key,0]));
 for(let i=0;i<1000;i++){const item=pickDashboardEgg(()=>(i+.5)/1000);counts.set(item.key,counts.get(item.key)+1);}
 assert.deepEqual([...counts.values()],[200,200,200,200,200]);
 assert.equal(pickDashboardEgg(()=>.21),pickDashboardEgg(()=>.21));
 for(const [i,item]of DASHBOARD_EGGS.entries()){assert.equal(pickDashboardEgg(()=>i/5),item);assert(fs.statSync('public/assets/decorations/'+item.file).isFile());assert(item.y<0&&item.smallY<0&&item.width!==item.smallWidth);}
 for(const value of [-1,1,NaN])assert.throws(()=>pickDashboardEgg(()=>value),RangeError);
});
function fixture(){const dom=new JSDOM('<section id="dashboard-page"><form></form></section>'),prior=globalThis.document;globalThis.document=dom.window.document;const win=dom.window,frames=new Map(),animations=[],media=new win.EventTarget();media.matches=false;win.matchMedia=()=>media;let id=0;
 win.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};win.cancelAnimationFrame=id=>frames.delete(id);
 win.HTMLElement.prototype.animate=function(keyframes,options){const a={target:this,keyframes,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;};
 return {dom,win,form:document.querySelector('form'),media,animations,frame(){const queue=[...frames.values()];frames.clear();queue.forEach(fn=>fn());},close(){globalThis.document=prior;dom.window.close();}};
}
test('one draw per visit; refresh, language, resize and repeated active state retain selection; decoded art waits for intro',async()=>{
 const f=fixture();let calls=0;const view=createDashboardEasterEgg(f.form,{random:()=>{calls++;return .41;}});
 try{assert.equal(f.form.querySelector('img'),null);document.documentElement.classList.add('how-brand-intro-active');view.setActive(true);const image=f.form.querySelector('img');image.decode=async()=>{};await image.onload();f.frame();assert.equal(f.animations.length,0);
  for(let i=0;i<4;i++)view.setActive(true);document.dispatchEvent(new f.win.Event('how:languagechange'));f.win.dispatchEvent(new f.win.Event('resize'));assert.equal(calls,1);assert.equal(f.form.querySelector('img'),image);assert.equal(f.form.dataset.eggHero,'ana');
  document.documentElement.classList.remove('how-brand-intro-active');await tick();f.frame();assert.equal(image.dataset.eggReady,'true');assert.equal(f.animations.length,1);assert.equal(f.animations[0].options.duration,380);assert.equal(image.alt,'');assert.equal(image.getAttribute('aria-hidden'),'true');
  view.setActive(false);assert.equal(f.form.querySelector('img'),null);assert(f.animations[0].cancelled);view.setActive(true);assert.equal(calls,2);assert.notEqual(f.form.querySelector('img'),image);assert.equal(f.form.dataset.eggHero,'ana');
 }finally{view.destroy();f.close();}
});
test('late decode and load errors never replace a newer visit; reduced motion reveals static art and destroy removes observers',async()=>{
 const f=fixture();let calls=0,resolve;const view=createDashboardEasterEgg(f.form,{random:()=>calls++? .81:.01});
 try{view.setActive(true);const old=f.form.querySelector('img');old.decode=()=>new Promise(r=>resolve=r);const pending=old.onload();view.setActive(false);view.setActive(true);const latest=f.form.querySelector('img');assert.equal(f.form.dataset.eggHero,'winston');resolve();await pending;f.frame();assert.equal(latest.dataset.eggReady,undefined);
  latest.dispatchEvent(new f.win.Event('error'));assert.equal(latest.hidden,true);assert.equal(calls,2);view.setActive(true);assert.equal(calls,2);
  view.setActive(false);f.media.matches=true;view.setActive(true);const staticImage=f.form.querySelector('img');staticImage.decode=async()=>{};await staticImage.onload();assert.equal(staticImage.dataset.eggReady,'true');assert.equal(f.animations.length,0);assert.equal(calls,3);
  view.destroy();document.documentElement.classList.add('how-brand-intro-active');await tick();f.frame();assert.equal(f.form.querySelector('img'),null);assert.equal(calls,3);
 }finally{view.destroy();f.close();}
});
