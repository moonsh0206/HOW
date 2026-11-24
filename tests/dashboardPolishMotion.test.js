import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDashboardTitleMotion} from '../src/views/dashboardTitleMotion.js';
import {createDashboardMapMotion} from '../src/views/dashboardMapMotion.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const dom=new JSDOM('<main><header><p>META</p><h1>Title</h1></header><section><div class="art"></div><div class="body"></div></section></main>'),win=dom.window,doc=win.document,animations=[],frames=new Map(),media=new win.EventTarget();let id=0;media.matches=false;win.matchMedia=()=>media;
 win.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};win.cancelAnimationFrame=id=>frames.delete(id);
 win.HTMLElement.prototype.animate=function(keyframes,options){let finish;const finished=new Promise(resolve=>finish=resolve),a={target:this,keyframes,options,finished,finish,cancelled:false,cancel(){this.cancelled=true;finish();}};animations.push(a);return a;};
 return {dom,win,doc,media,animations,frame(){const queue=[...frames];frames.clear();for(const [,fn]of queue)fn(0);},close(){dom.window.close();}};
}
test('intro reveal owns first title entrance; normal visits animate once and cancel on leave',async()=>{
 const f=fixture(),root=f.doc.querySelector('main'),targets=[...f.doc.querySelector('header').children],motion=createDashboardTitleMotion(root,targets);
 try{
  f.doc.documentElement.classList.add('how-brand-intro-active');motion.setActive(true);f.frame();f.frame();assert.equal(f.animations.length,0);
  f.doc.documentElement.classList.remove('how-brand-intro-active');await tick();f.frame();f.frame();assert.equal(f.animations.length,0);
  targets[1].textContent='Translated';motion.setActive(true);await tick();f.frame();f.frame();assert.equal(f.animations.length,0);
  motion.setActive(false);assert(f.animations.every(a=>a.cancelled));motion.setActive(true);f.frame();f.frame();assert.deepEqual(f.animations.map(a=>a.options.duration),[500,620]);
  f.media.matches=true;f.media.dispatchEvent(new f.win.Event('change'));assert(f.animations.every(a=>a.cancelled));assert(!root.classList.contains('dashboard-title-pending'));
 }finally{motion.destroy();f.close();}
});
test('title skip, reduced motion and unsupported animation leave final readable content',async()=>{
 const f=fixture(),root=f.doc.querySelector('main'),targets=[...f.doc.querySelector('header').children];let motion;
 try{f.media.matches=true;motion=createDashboardTitleMotion(root,targets);motion.setActive(true);f.frame();assert.equal(f.animations.length,0);assert(!root.classList.contains('dashboard-title-pending'));motion.destroy();
  f.media.matches=false;targets[0].animate=undefined;motion=createDashboardTitleMotion(root,targets);motion.setActive(true);assert(!root.classList.contains('dashboard-title-pending'));
 }finally{motion?.destroy();f.close();}
});
function mapFixture(){
 const f=fixture(),panel=f.doc.querySelector('section'),art=panel.querySelector('.art'),body=panel.querySelector('.body'),motion=createDashboardMapMotion({panel,art,body});
 const data=(key,status='ready',imageUrl='')=>{const content=f.doc.createElement('div'),row=f.doc.createElement('p');row.textContent=key+' heroes';content.append(row);if(status==='ready'){const stamp=f.doc.createElement('small');stamp.dataset.mapObserved='true';stamp.textContent=key+' observed';content.append(stamp);}return {key,mapKey:key,mapName:key,status,imageUrl,content,signature:key+status+imageUrl,previousLabel:name=>name+' (previous map; loading)'};};
 return {...f,panel,art,body,motion,data};
}
test('map keeps explicit previous-map content during loading, rejects old transition, and handles reduced motion mid-flight',async()=>{
 const f=mapFixture();try{
  f.motion.render(f.data('a','loading'));assert.equal(f.animations.length,0);f.motion.render(f.data('a'));await tick();f.animations.findLast(a=>a.options.duration===170)?.finish();await tick();assert.equal(f.body.dataset.mapKey,'a');
  f.motion.render(f.data('b','loading'));assert(f.body.textContent.includes('a (previous map; loading)'));assert.equal(f.body.inert,true);assert.equal(f.panel.getAttribute('aria-busy'),'true');
  f.motion.render(f.data('b'));await tick();const exitB=f.animations.at(-1);assert.equal(exitB.options.duration,170);
  f.motion.render(f.data('c','loading'));f.motion.render(f.data('c'));await tick();assert(exitB.cancelled);f.animations.at(-1).finish();await tick();assert.equal(f.body.dataset.mapKey,'c');assert(!f.body.textContent.includes('b heroes'));assert.equal(f.body.inert,false);
  const count=f.animations.length;f.motion.render(f.data('c'));assert.equal(f.animations.length,count);
  f.motion.render(f.data('d'));f.media.matches=true;f.media.dispatchEvent(new f.win.Event('change'));await tick();assert.equal(f.body.dataset.mapKey,'d');assert.equal(f.panel.getAttribute('aria-busy'),'false');assert(!f.body.classList.contains('is-map-pending'));
  f.media.matches=false;f.media.dispatchEvent(new f.win.Event('change'));f.media.matches=true;f.media.dispatchEvent(new f.win.Event('change'));await tick();assert(f.body.textContent.includes('d heroes'));
  f.motion.cancel();assert(f.animations.every(a=>a.cancelled));
 }finally{f.motion.destroy();f.close();}
});
test('map images crossfade only after preload; failures fall back, late images and destroyed transitions cannot replace current map',async()=>{
 const f=mapFixture(),images=[],create=f.doc.createElement.bind(f.doc);f.doc.createElement=(tag,...args)=>{const e=create(tag,...args);if(tag==='img'){e.decode=async()=>{};images.push(e);}return e;};
 try{
  f.motion.render(f.data('a','ready','https://example.test/a.jpg'));images[0].onload();await tick();assert.equal(f.art.querySelectorAll('img').length,1);
  f.motion.render(f.data('b','ready','https://example.test/b.jpg'));images[1].onload();await tick();f.animations.findLast(a=>a.options.duration===170).finish();await tick();assert.equal(f.art.querySelectorAll('img').length,2);assert.equal(f.body.dataset.mapKey,'b');for(const a of f.animations.filter(a=>a.options.duration===320))a.finish();await tick();assert.equal(f.art.querySelectorAll('img').length,1);
  f.motion.render(f.data('bad','ready','https://example.test/bad.jpg'));images[2].onerror();await tick();f.animations.findLast(a=>a.options.duration===170).finish();await tick();assert.equal(f.art.dataset.state,'fallback');
  f.motion.render(f.data('late','ready','https://example.test/late.jpg'));f.motion.destroy();images[3].onload();await tick();assert.equal(f.body.dataset.mapKey,'bad');
 }finally{f.motion.destroy();f.close();}
});
