import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createBannerEntrance} from '../src/views/bannerEntrance.js';
function setup(reduce=false){
 const dom=new JSDOM('<section><p class="eyebrow">Slogan</p><h1>First<br><em>Second</em></h1><p class="banner-copy">Copy</p><a class="primary-button">Go</a></section>');
 const win=dom.window,root=win.document.querySelector('section'),calls=[],frames=new Map();let id=0;
 const media={matches:reduce,addEventListener(){},removeEventListener(){}};
 win.matchMedia=()=>media;win.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};win.cancelAnimationFrame=i=>frames.delete(i);
 win.HTMLElement.prototype.getClientRects=()=>[{}];win.HTMLElement.prototype.animate=function(keys,options){const a={cancelled:false,cancel(){this.cancelled=true;}};calls.push({element:this,keys,options,a});return a;};
 return {root,calls,media,view:createBannerEntrance(root,win),flush(){const all=[...frames.values()];frames.clear();all.forEach(fn=>fn());}};
}
test('banner entrance waits for connected frame, staggers five elements and preserves heading',()=>{
 const h=setup();h.view.setVisible(true);assert.equal(h.calls.length,0);h.flush();assert.equal(h.calls.length,5);assert.deepEqual(h.calls.map(c=>c.options.delay),[0,80,160,240,320]);assert.equal(h.calls.at(-1).options.duration+320,780);assert.equal(h.root.querySelector('h1').textContent,'FirstSecond');assert.equal(h.root.querySelectorAll('h1').length,1);
 h.view.setVisible(true);h.flush();assert.equal(h.calls.length,5);h.view.setVisible(false);assert(h.calls.every(c=>c.a.cancelled));h.view.setVisible(true);h.flush();assert.equal(h.calls.length,10);assert.equal(h.root.querySelectorAll('.banner-title-first').length,1);h.view.destroy();
});
test('reduced motion, cancelled visit, disconnected DOM and unavailable animation leave readable content',()=>{
 const h=setup(true);h.view.setVisible(true);h.flush();assert.equal(h.calls.length,0);assert.equal(h.root.style.opacity,'');
 const b=setup();b.view.setVisible(true);b.view.setVisible(false);b.flush();assert.equal(b.calls.length,0);b.view.setVisible(true);b.root.remove();b.flush();assert.equal(b.calls.length,0);
 const c=setup();for(const e of c.root.querySelectorAll('*'))e.animate=undefined;c.view.setVisible(true);c.flush();assert.equal(c.calls.length,0);assert.equal(c.root.textContent,'SloganFirstSecondCopyGo');
});
