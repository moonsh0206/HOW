import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {prepareChartMotion,syncChartMotion} from '../src/views/chartMotion.js';
function harness(reduce=false){
 const dom=new JSDOM('<main></main>'),win=dom.window,host=win.document.querySelector('main'),frames=new Map(),observers=[],motions=[];let id=0,visible=false;
 win.matchMedia=()=>({matches:reduce});win.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};win.cancelAnimationFrame=id=>frames.delete(id);
 win.IntersectionObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
 win.Element.prototype.animate=function(keyframes,options){let done;const animation={effect:{target:this},keyframes,options,currentTime:0,playState:'running',finished:new Promise(r=>done=r),cancel(){this.playState='idle';done();},pause(){this.playState='paused';},play(){this.playState='running';},finish(){this.playState='finished';done();}};motions.push(animation);return animation;};
 const show=(kind='map',value=1)=>{const panel=win.document.createElement('section');panel.id='pick-history';panel.className=kind==='map'?'map-comparison':'';panel.innerHTML=kind==='map'?'<div class="map-compare-chart"><div class="map-bar"></div><span data-series="selected"><div class="map-bar"></div></span><b class="map-value">52.00%</b></div>':'<div class="history-graph"><svg><g class="history-trace"></g><g><ellipse class="history-dot"/></g></svg></div>';prepareChartMotion(panel,[kind,value]);const plot=panel.firstChild;plot.getClientRects=()=>visible?[{}]:[];plot.getBoundingClientRect=()=>({top:100,bottom:200});host.replaceChildren(panel);syncChartMotion(host,'genji');return panel;};
 return {host,show,motions,observers,flush(){for(let i=0;i<3;i++){const q=[...frames.values()];frames.clear();q.forEach(fn=>fn());}},visibility(value){visible=value;for(const o of observers)if(!o.disconnected)o.cb([{isIntersecting:value}]);},async finish(){motions.filter(a=>a.playState==='running').forEach(a=>a.finish());await new Promise(r=>setImmediate(r));}};
}
test('connected chart waits for visibility, runs once, and same-data render does not suppress unfinished entry',async()=>{
 const h=harness();let chart=h.show();h.flush();assert.equal(h.motions.length,0);assert.equal(chart.dataset.chartMotion,'pending');
 chart=h.show();h.visibility(true);h.flush();assert.equal(chart.dataset.chartMotion,'running');assert.equal(h.motions.length,3);
 h.motions[0].currentTime=100;chart=h.show();h.flush();assert.equal(h.motions.at(-1).currentTime,100);assert(h.motions.slice(0,3).every(a=>a.playState==='idle'));
 await h.finish();assert.equal(chart.dataset.chartMotion,'complete');const count=h.motions.length;h.visibility(false);h.visibility(true);h.flush();assert.equal(h.motions.length,count);
 chart=h.show();h.flush();assert.equal(chart.dataset.chartMotion,'complete');assert.equal(h.motions.length,count);
});
test('type/metric changes cancel previous animations; reduced motion and empty states stay final',async()=>{
 const h=harness();h.visibility(true);h.show();h.flush();await h.finish();const chart=h.show('history');h.flush();assert.equal(chart.dataset.chartMotion,'running');assert(h.motions.some(a=>a.options.duration===120));
 h.show('map',2);h.flush();assert.equal(h.host.querySelectorAll('.chart-exit-layer').length,1);assert.equal(h.host.querySelectorAll('.chart-exit-layer .chart-exit-layer').length,0);assert.equal(h.host.querySelectorAll('.map-bar').length,2);
 const empty=h.host.ownerDocument.createElement('section');empty.id='pick-history';h.host.replaceChildren(empty);syncChartMotion(h.host);assert.equal(empty.dataset.chartMotion,undefined);
 const reduced=harness(true);const r=reduced.show();reduced.visibility(true);reduced.flush();assert.equal(r.dataset.chartMotion,'complete');assert.equal(reduced.motions.length,0);
});
test('fast async loading hands off the remaining exit rather than dropping or restarting it',async()=>{
 const h=harness();h.visibility(true);h.show();h.flush();await h.finish();
 const loading=h.host.ownerDocument.createElement('section');loading.id='pick-history';loading.innerHTML='<p class="map-comparison-empty">Loading</p>';h.host.replaceChildren(loading);syncChartMotion(h.host);
 const exit=h.motions.at(-1);assert.equal(exit.options.duration,120);exit.currentTime=30;
 h.show('history');h.flush();assert.equal(exit.playState,'idle');
 const fade=h.motions.findLast(a=>a.effect.target.classList.contains('chart-exit-layer')&&a.playState==='running');assert.equal(fade.options.duration,90);assert.equal(fade.keyframes[0].opacity,.75);
 assert.equal(h.host.querySelectorAll('.chart-exit-layer').length,1);
});
