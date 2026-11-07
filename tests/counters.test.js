import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { COUNTER_RELATIONS } from '../src/data/counters.js';
import { COUNTER_HERO_KEYS } from '../src/data/counters/roster.js';
import { normalizeCounters } from '../src/models/counterModel.js';
import { createCounterService } from '../src/services/counterService.js';
import { unavailablePerkSelection } from '../src/models/perkSelectionModel.js';
import { renderCounters } from '../src/views/counterView.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { createHeroModel } from '../src/models/heroModel.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createRoutingController } from '../src/controllers/routingController.js';
const heroes = JSON.parse(fs.readFileSync(new URL('../docs/research/phase3/hero-roster.json', import.meta.url), 'utf8')).heroes.map(hero=>({...hero,portrait:'https://example.com/'+hero.key+'.png'}));
test('counter directions: targets are counteredBy attackers, inverse index is counters, never vice versa',()=>{
  const service=createCounterService();
  const genji=service.getHeroCounters('genji',heroes);
  assert.deepEqual(genji.counteredBy.map(h=>h.heroKey),['winston','moira','symmetra','torbjorn']);assert.deepEqual(genji.counters,[]);
  assert.equal(genji.pendingCount,1);assert(!('synergies' in genji));
  const torb=service.getHeroCounters('torbjorn',heroes);
  assert.deepEqual(torb.counteredBy.map(h=>h.heroKey),['hanzo','ashe','soldier-76']);assert(torb.counters.some(h=>h.heroKey==='genji'&&h.evidenceStatus==='conflicting'));
  assert.deepEqual(service.getHeroCounters('ana',heroes).counteredBy.map(h=>h.heroKey),['kiriko','winston']);
  assert(service.getHeroCounters('ana',heroes).counters.some(h=>h.heroKey==='roadhog'));
  assert(service.getHeroCounters('ana',heroes).counters.some(h=>h.heroKey==='mauga'));
  assert.equal(heroes.filter(h=>service.getHeroCounters(h.key,heroes).counteredBy.length).length,50);
  assert.equal(service.getHeroCounters('unknown',heroes).status,'empty');
  assert.equal(service.getHeroCounters('genji',[]).counteredBy.length,0);
  assert(genji.counteredBy.every(h=>h.sourceType==='manual-review'&&h.gameMode==='5v5'&&h.relationType==='counteredBy'&&h.applicablePatch===null&&!('winRate' in h)&&!('confidence' in h)));
  assert.throws(()=>normalizeCounters([{...COUNTER_RELATIONS[0],relationType:'synergies'}]));
});
test('counter validation: self/duplicate/unsafe/missing records fail safely',()=>{
  const row=COUNTER_RELATIONS[0];
  for(const raw of [null,[{...row,heroKey:123}],[{...row,counterHeroKey:row.heroKey}],[row,row],[{...row,sourceUrl:'javascript:bad'}],[{...row,reason:null}],[{...row,reviewedAt:'bad'}],[{...row,reviewedAt:'2026-02-31'}],[{...row,sourceType:'statistics'}],[{...row,gameMode:'6v6'}],[{...row,status:'needs-review',conflicts:[]}]]){
    assert.throws(()=>normalizeCounters(raw));assert.equal(createCounterService(raw).getHeroCounters('genji',heroes).status,'error');
  }
});
test('whole database: real roster keys, evidence schema, no numeric provider scores, graph direction',()=>{
  const rows=normalizeCounters(COUNTER_RELATIONS),known=new Set(heroes.map(h=>h.key));
  assert.equal(known.size,54);assert.deepEqual([...known].sort(),[...COUNTER_HERO_KEYS].sort());
  assert.equal(rows.length,82);assert.equal(new Set(rows.map(r=>r.heroKey)).size,50);
  assert.equal(rows.filter(r=>r.evidenceStatus==='conflicting').length,3);
  for(const row of rows){
    assert(known.has(row.heroKey)&&known.has(row.counterHeroKey));assert.notEqual(row.heroKey,row.counterHeroKey);
    assert(row.sourceUrls.length>=2);assert.equal(row.mode,'5v5');assert.equal(row.reviewedAt,'2026-11-03');
    assert(!('score' in row)&&!('winRate' in row)&&!('confidence' in row));
    const service=createCounterService([row]);
    assert.equal(service.getHeroCounters(row.heroKey,heroes).counteredBy[0].heroKey,row.counterHeroKey);
    assert.equal(service.getHeroCounters(row.counterHeroKey,heroes).counters[0].heroKey,row.heroKey);
    if(row.counterType!=='ability'){assert.equal(row.statisticalEvidence.metricType,'counter-rating-index');assert.equal(row.statisticalEvidence.rank,'all');assert.equal(row.statisticalEvidence.queue,null);}
  }
  assert.throws(()=>normalizeCounters([{...rows[0],heroKey:'not-a-how-hero'}]));
  assert.throws(()=>normalizeCounters([{...rows[0],counterType:'winrate'}]));
});
test('required cases: contradictory evidence retained; current kit caveats replace old abilities',()=>{
  const find=(key,counter)=>COUNTER_RELATIONS.find(r=>r.heroKey===key&&r.counterHeroKey===counter);
  for(const pair of [['zarya','reinhardt'],['zarya','winston'],['doomfist','orisa'],['doomfist','mizuki'],['venture','cassidy']])assert(find(...pair));
  assert.equal(find('zarya','winston').evidenceStatus,'conflicting');assert.equal(find('zarya','winston').statisticalEvidence.direction,'opposes');
  assert.equal(find('venture','cassidy').evidenceStatus,'conflicting');assert(!/섬광탄|자력/.test(find('venture','cassidy').reason));
  assert(find('roadhog','ana').reason.includes('압축기'));
  assert(!/해킹.*봉쇄/.test(find('sombra','winston').reason));
  const evidence=JSON.parse(fs.readFileSync(new URL('../docs/research/phase35/official-kits.json',import.meta.url),'utf8'));
  assert.equal(evidence.heroes.length,54);assert(evidence.heroes.every(h=>h.status===200&&h.verified));
});
test('perk selection is unavailable with null denominators, no manufactured rates or enabled API',()=>{
  const state=unavailablePerkSelection('genji');assert.equal(state.status,'unavailable');assert.equal(state.permission,'user-confirmed-provider-approval');assert.equal(state.sample.minor,null);assert.equal(state.sample.major,null);assert.deepEqual(state.entries,[]);assert.equal(state.window,null);
});
test('counter DOM: safe text, three-item maximum, fallbacks and hash links',()=>{
  const dom=new JSDOM('<body></body>'),old=globalThis.document;globalThis.document=dom.window.document;
  try{
    const service=createCounterService(COUNTER_RELATIONS.map(r=>({...r,reason:'<img src=x onerror=bad>'})));
    const data=service.getHeroCounters('genji',heroes);data.counteredBy=[...data.counteredBy,...data.counteredBy];
    const panel=renderCounters(data);assert.equal(panel.querySelectorAll('.counter-hero').length,3);assert.equal(panel.querySelector('.counter-hero').hash,'#/heroes/winston');assert(panel.textContent.includes('<img'));assert.equal(panel.querySelectorAll('img').length,3);
    const conflictPanel=renderCounters(createCounterService().getHeroCounters('zarya',heroes));assert(conflictPanel.textContent.includes('상황에 따라 유리'));assert(conflictPanel.textContent.includes('근거 상충'));
    assert(renderCounters({status:'empty',counteredBy:[]}).textContent.includes('확인된 카운터 정보가 없습니다'));
    const portrait=panel.querySelector('.counter-portrait');portrait.querySelector('img').dispatchEvent(new dom.window.Event('error'));assert.equal(portrait.querySelector('img'),null);assert(portrait.textContent);
  }finally{globalThis.document=old;dom.window.close();}
});
test('detail integration: counter link navigation, absent hero data and favorite controls preserved',async()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/overfast-genji.json',import.meta.url),'utf8'));
  const dom=new JSDOM(html,{url:'https://example.github.io/HOW/#/heroes/genji'}),prior={document:globalThis.document,window:globalThis.window,location:globalThis.location};
  Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});let router;
  try{
    const model=createHeroModel();model.state.heroes=heroes;
    router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{async getHero(key){return{detail:normalizeHeroDetail({...raw,name:key},key),fetchedAt:'2026-11-03T00:00:00Z'};}}});
    router.start();await new Promise(r=>setImmediate(r));
    assert(document.querySelector('.detail-summary [data-favorite="genji"]'));assert.equal(document.querySelectorAll('.counter-panel .counter-hero').length,3);
    const top=document.querySelector('.detail-summary > .detail-summary-top');assert(top);assert(top.firstElementChild.matches('.detail-summary-main'));assert(top.querySelector('.detail-summary-side > .counter-panel'));
    assert(document.querySelector('.detail-summary-main > #pick-history'));assert.equal(document.querySelectorAll('#pick-history').length,1);
    assert(document.querySelector('#pick-history').compareDocumentPosition(document.querySelector('.detail-tabs'))&4);
    assert.equal(document.querySelector('.detail-overview'),null);assert.equal(top.querySelectorAll('.detail-metrics > div').length,4);
    assert([...top.querySelectorAll('.counter-explanation')].every(el=>!el.open));
    assert(!/65:25:10|S 자격/.test(document.querySelector('#hero-detail-page').textContent));
    location.hash=document.querySelector('.counter-hero').getAttribute('href');window.dispatchEvent(new window.HashChangeEvent('hashchange'));await new Promise(r=>setImmediate(r));
    assert.equal(document.querySelector('#hero-detail-page h1').textContent,'winston');
    location.hash='#/heroes/dmon';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await new Promise(r=>setImmediate(r));
    assert(document.querySelector('.counter-panel').textContent.includes('확인된 카운터 정보가 없습니다'));
    assert(document.querySelector('#detail-perk-rates').textContent.includes('미제공'));
  }finally{router?.stop();dom.window.close();Object.assign(globalThis,prior);}
});
test('responsive contract: shared summary splits on desktop and keeps three icon columns on mobile',()=>{
  const css=fs.readFileSync(new URL('../src/styles/detail.css',import.meta.url),'utf8');
  assert(css.includes('@media(max-width:700px){.detail-summary-top{grid-template-columns:minmax(0,1fr)'));
  assert(css.includes('.counter-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
  assert(css.includes('.counter-hero>span:last-child{min-width:0;overflow-wrap:anywhere}'));
});
