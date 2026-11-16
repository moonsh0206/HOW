import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createHeroModel} from '../src/models/heroModel.js';

test('detail tab-only and identical async updates preserve chart, metrics, perk nodes and focus; reduced motion skips animation',async()=>{
 const html=await readFile('index.html','utf8'),detail=normalizeHeroDetail(JSON.parse(await readFile('tests/fixtures/overfast-genji.json','utf8')),'genji');
 for(const reduced of [false,true]){
  const dom=new JSDOM(html,{url:'https://example.org/HOW/'}),saved={window:globalThis.window,document:globalThis.document};Object.assign(globalThis,{window:dom.window,document:dom.window.document});
  const animations=[];dom.window.matchMedia=()=>({matches:reduced});dom.window.Element.prototype.animate=function(frames,options){animations.push(options);};
  try{
   const model=createHeroModel(),view=createHeroDetailView(),ready={status:'ready',result:{detail,fetchedAt:'2026-11-16T01:00:00Z'}},route={key:'genji',tab:'overview'};
   view.render({status:'loading'},model,route);assert.equal(document.querySelector('#hero-detail-page').getAttribute('aria-busy'),'true');assert(document.querySelector('.detail-loading-summary'));assert(!document.querySelector('.detail-loading-hero').hasAttribute('aria-hidden'));
   view.render(ready,model,route);assert.equal(document.querySelector('#hero-detail-page').getAttribute('aria-busy'),'false');
   const chart=document.querySelector('.pick-history'),metric=document.querySelector('[data-history-metric]'),perk=document.querySelector('#detail-minor .perk-selection'),passive=document.querySelector('#detail-passives');metric.focus();
   const count=animations.length;view.render(ready,model,route);assert.equal(document.querySelector('.pick-history'),chart);assert.equal(document.activeElement,metric);assert.equal(animations.length,count);
   for(const tab of ['abilities','perks','overview']){view.render(ready,model,{...route,tab});assert.equal(document.querySelector('.pick-history'),chart);assert.equal(document.querySelector('[data-history-metric]'),metric);assert.equal(document.querySelector('#detail-minor .perk-selection'),perk);assert.equal(document.querySelector('#detail-passives'),passive);assert.equal(document.querySelector(`[data-detail-tab="${tab}"]`).getAttribute('aria-current'),'page');}
   assert.equal(animations.length===0,reduced);assert(animations.every(o=>o.duration>=150&&o.duration<=250));
  }finally{dom.window.close();Object.assign(globalThis,saved);}
 }
});
