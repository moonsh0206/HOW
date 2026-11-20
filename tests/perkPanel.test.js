import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPerkComparison,renderPerkSelection} from '../src/views/perkStatisticsView.js';

test('bar labels retain zero, tiny and incomplete provider percentages without growing fills, moving narrow labels above the track',()=>{
 const dom=new JSDOM('<main></main>'),previous=globalThis.document;globalThis.document=dom.window.document;
 try{for(const rates of [[50,50],[80,20],[95,5],[99.9,.1],[0,100],[100,0],[0,0],[12,34]]){
  const items=rates.map((selectionRate,i)=>({name:i?'Right':'<img src=x onerror=bad>',selection:{status:'ready',selectionRate,selectionCount:i?99:1}})),partial=Math.abs(rates[0]+rates[1]-100)>1e-6;
  const box=renderPerkComparison(items,{status:'ready',entries:items.map(i=>i.selection),partial}),bar=box.querySelector('.perk-pair-bar');
  assert.deepEqual([...bar.querySelectorAll('.perk-pair-left,.perk-pair-right')].map(e=>parseFloat(e.style.width)),rates);
  assert.deepEqual([...box.querySelectorAll('.perk-bar-value')].map(e=>e.textContent),rates.map(r=>r.toFixed(1)+'%'));assert.equal(bar.querySelector('img'),null);assert(bar.getAttribute('aria-label').includes(items[0].name));assert.equal(box.querySelector('.perk-bar-labels').getAttribute('aria-hidden'),'true');
  const spread=partial||rates.some(r=>r<20);assert.equal(bar.dataset.labelLayout,spread?'spread':'segments');assert.equal(!!bar.querySelector('.perk-bar-labels'),!spread);assert.equal(!!box.querySelector('small'),partial);
  const meta=renderPerkSelection(items[0],{status:'ready'},{showBar:false,showRate:false});assert.equal(meta.querySelector('strong'),null);assert(meta.textContent.includes('1'));
 }}finally{dom.window.close();globalThis.document=previous;}
});
test('unavailable or incompatible pair has no fill or invented percentage labels',()=>{
 const dom=new JSDOM(),previous=globalThis.document;globalThis.document=dom.window.document;
 try{for(const status of ['unavailable','incompatible']){const box=renderPerkComparison([],{status});assert.equal(box.querySelector('.perk-pair-bar'),null);assert.equal(box.querySelector('.perk-bar-value'),null);assert(box.textContent.length>0);}}finally{dom.window.close();globalThis.document=previous;}
});
