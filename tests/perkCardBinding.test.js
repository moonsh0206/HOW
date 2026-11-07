import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {normalizePerkArchive} from '../src/models/perkArchiveModel.js';
import {perkCardsForDetail} from '../src/models/perkSelectionModel.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createRoutingController} from '../src/controllers/routingController.js';
import {createPerkStatisticsService} from '../src/services/perkStatisticsService.js';
const json=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const raw=await json('../public/data/perks/overlooker-perks.json'),archive=normalizePerkArchive(raw),identities=await json('./fixtures/overfast-perk-identities.json'),genji=normalizeHeroDetail(await json('./fixtures/overfast-genji.json'),'genji');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
async function domRun(run){const dom=new JSDOM(html,{url:'https://moonsh0206.github.io/HOW/#/heroes/genji'});const old={document:globalThis.document,window:globalThis.window,location:globalThis.location};Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});try{await run(dom.window);}finally{dom.window.close();Object.assign(globalThis,old);}}
test('stored JSON -> Model -> existing cards: all 54 heroes and 216 perks match exact rates/counts without standalone statistics cards',()=>domRun(()=>{
 const model=createHeroModel(),view=createHeroDetailView();let total=0;
 for(const identity of identities){const detail={...genji,...identity,name:identity.key,minor:identity.minor.map(p=>({...p,description:'기존 설명'})),major:identity.major.map(p=>({...p,description:'기존 설명'}))};
  const state={status:'ready',result:archive.frames.get(identity.key)},before=JSON.stringify(detail),cards=perkCardsForDetail(identity.key,detail,state);assert.equal(JSON.stringify(detail),before);
  view.render({status:'ready',result:{detail,fetchedAt:'2026-11-07T00:00:00Z'}},model,{key:identity.key,tab:'overview'},undefined,undefined,undefined,undefined,{...state,cards});
  for(const tier of ['minor','major'])for(const card of document.querySelectorAll(`#detail-${tier} .ability-card`)){const item=cards[tier].find(p=>p.name===card.querySelector('h3').textContent),entry=item.selection;assert.equal(entry.status,'ready');assert.equal(card.querySelector('.perk-selection-heading strong').textContent,entry.selectionRate.toFixed(2)+'%');assert.match(card.querySelector('.perk-selection-heading span').textContent,new RegExp(entry.selectionCount.toLocaleString('ko-KR')));assert.equal(Number(card.querySelector('[role=meter]').getAttribute('aria-valuenow')),entry.selectionRate);total++;}
  const source=document.querySelector('#detail-perk-rates');assert.equal(source.tagName,'FOOTER');assert.equal(source.querySelector('.ability-card'),null);assert.equal(source.querySelector('h2'),null);assert(source.textContent.includes('HOW 수집'));assert(!document.querySelector('#hero-detail-page').textContent.includes('특전 탭에서'));
 }
 assert.equal(total,216);
}));
test('overview auto-load: delayed actual JSON updates all four existing cards, preserving description nodes, focus and disclosure',()=>domRun(async()=>{
 let resolve,calls=0;const service=createPerkStatisticsService({base:'/HOW/',fetcher:async()=>{calls++;return new Promise(r=>resolve=()=>r({ok:true,json:async()=>raw}));}}),model=createHeroModel();model.state.heroes=[genji];
 const router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{getHero:async()=>({detail:genji,fetchedAt:'2026-11-07T00:00:00Z'})},perkStatisticsService:service});
 try{router.start();await tick();await tick();assert.equal(calls,1);assert.equal(document.querySelectorAll('.perk-selection-bar').length,0);
  const cards=[...document.querySelectorAll('#detail-minor .ability-card,#detail-major .ability-card')],paragraphs=cards.map(c=>c.querySelector('p'));
  const disclosure=document.createElement('details'),summary=document.createElement('summary');summary.textContent='원래 카드 동작';disclosure.append(summary);cards[0].append(disclosure);disclosure.open=true;summary.focus();
  resolve();await tick();await tick();assert.equal(document.querySelectorAll('.perk-selection-bar').length,4);assert.equal(document.activeElement,summary);assert.equal(disclosure.open,true);
  const current=[...document.querySelectorAll('#detail-minor .ability-card,#detail-major .ability-card')];current.forEach((c,i)=>{assert.equal(c,cards[i]);assert.equal(c.querySelector('p'),paragraphs[i]);});
  const source=document.querySelector('#detail-perk-rates'),link=source.querySelector('a');link.focus();router.refresh();assert.equal(document.querySelector('#detail-perk-rates'),source);assert.equal(document.activeElement,link);assert.equal(calls,1);
 }finally{router.stop();}
}));
test('Model card composition excludes another hero, unknown identity and missing values rather than inventing 0',()=>{
 const wrong=perkCardsForDetail('genji',genji,{status:'ready',result:archive.frames.get('ana')});assert(wrong.minor.every(p=>p.selection.selectionRate===null));
 const missing=structuredClone(archive.frames.get('genji'));missing.entries[0]={...missing.entries[0],selectionRate:null,status:'unavailable'};const cards=perkCardsForDetail('genji',genji,{status:'ready',result:missing});assert.equal(cards.minor[0].selection.selectionRate,null);assert.equal(cards.minor[1].selection.status,'ready');
});
