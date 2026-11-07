import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {normalizePerkStatistics,normalizeAllPerkStatistics,perkSelectionForItem,perkHeroMapping,perkCardsForDetail} from '../src/models/perkSelectionModel.js';
import {createDirectPerkStatisticsService as createPerkStatisticsService} from '../src/services/perkStatisticsService.js';
import {renderPerkSelection,renderPerkStatisticsInfo} from '../src/views/perkStatisticsView.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createRoutingController} from '../src/controllers/routingController.js';
const load=async name=>JSON.parse(await readFile(new URL(`./fixtures/${name}.json`,import.meta.url),'utf8'));
const raw=await load('overlooker-genji'),all=await load('overlooker-perks'),identities=await load('overfast-perk-identities'),detailRaw=await load('overfast-genji');
const clone=x=>JSON.parse(JSON.stringify(x)),reply=data=>({ok:true,json:async()=>clone(data)}),tick=()=>new Promise(r=>setImmediate(r));
test('captured OverLooker: 54 explicit hero mappings and 216 current tier/identity joins, rates are fractions',()=>{
 const normalized=normalizeAllPerkStatistics(all);assert.equal(normalized.length,54);let total=0;
 for(const h of identities){const frame=normalized.find(n=>n.heroKey===h.key),mapping=perkHeroMapping(h.key);assert.equal(h.role,mapping.role);assert.equal(mapping.perks.length,4);
  for(const tier of ['minor','major'])for(const item of h[tier]){const entry=perkSelectionForItem(h.key,tier,item,frame,{date:'2026-11-07'});assert.equal(entry.status,'ready',`${h.key} ${item.name}`);assert.equal(entry.sampleSize,null);assert.equal(entry.observedAt,null);total++;}
 }
 assert.equal(total,216);assert.equal(perkHeroMapping('jetpack-cat').providerHeroSlug,'jetpack_cat');assert.equal(perkHeroMapping('soldier-76').providerHeroSlug,'soldier_76');
 const g=normalizePerkStatistics(raw,'genji');assert.equal(g.entries[0].selectionRate,35.79);assert.equal(g.entries[0].selectionCount,355);assert.equal(g.providerSampleSize,1753);assert.equal(g.sample.minor,null);assert.equal(g.sample.major,null);assert.equal(g.observedAt,undefined);assert.equal(g.patch,null);
 // sample_size cannot be used as the per-stage denominator or claimed as matches.
 const ana=normalized.find(n=>n.heroKey==='ana');assert.notEqual(ana.entries.reduce((n,p)=>n+p.selectionCount,0),ana.providerSampleSize);
});
test('perk normalization: real zero survives, null/invalid is absent, duplicates/wrong hero fail, removed/replaced identity never inherits',()=>{
 for(const value of [0,null,-1,1.1,'0.5',NaN]){const data=clone(raw);data.perks[0].pick_rate=value;data.perks[0].picks=value===0?0:null;const entry=normalizePerkStatistics(data,'genji').entries[0];assert.equal(entry.selectionRate,value===0?0:null);assert.equal(entry.selectionCount,value===0?0:null);}
 assert.throws(()=>normalizePerkStatistics(raw,'ana'));assert.throws(()=>normalizePerkStatistics({...raw,perks:[raw.perks[0],raw.perks[0]]},'genji'));
 const frame=normalizePerkStatistics(raw,'genji'),item=identities.find(h=>h.key==='genji').minor[0];
 assert.equal(perkSelectionForItem('genji','major',item,frame).status,'mapping-review');assert.equal(perkSelectionForItem('genji','minor',{...item,name:'과거 이름'},frame).status,'mapping-review');assert.equal(perkSelectionForItem('genji','minor',{...item,icon:item.icon+'?changed'},frame).status,'mapping-review');
 const old=clone(raw);old.perks[0].slug='removed_perk';const oldFrame=normalizePerkStatistics(old,'genji');assert.equal(oldFrame.entries[0].status,'mapping-review');assert.equal(perkSelectionForItem('genji','minor',item,oldFrame).selectionRate,null);
 const anaItem=identities.find(h=>h.key==='ana').minor.find(p=>p.name==='국소 마취');assert.equal(perkSelectionForItem('ana','minor',anaItem,normalizeAllPerkStatistics(all).find(r=>r.heroKey==='ana'),{date:'2026-10-05'}).status,'inactive');
});
test('perk service: hero-only endpoint, in-flight deduplication, finite cache TTL and max two requests',async()=>{
 let clock=Date.parse('2026-11-07T00:00:00Z'),calls=0,active=0,max=0;const paths=[];
 const service=createPerkStatisticsService({now:()=>clock,ttlMs:1000,fetcher:async url=>{paths.push(url);calls++;active++;max=Math.max(max,active);await tick();active--;const slug=url.split('/').at(-1);const h=all.heroes.find(h=>h.hero===slug);return reply({...h,filters:all.filters});}});
 const a=service.getHeroPerks('genji'),b=service.getHeroPerks('genji');assert.equal(a,b);await Promise.all([a,b]);assert.equal(calls,1);assert.equal((await service.getHeroPerks('genji')).cached,true);assert.equal(calls,1);
 clock+=1001;await service.getHeroPerks('genji');assert.equal(calls,2);
 await Promise.all(['ana','ashe','baptiste','bastion'].map(k=>service.getHeroPerks(k)));assert.equal(max,2);assert(paths.every(p=>/^https:\/\/stats.overlooker.app\/api\/perks\/[a-z0-9_]+$/.test(p)));await assert.rejects(service.getHeroPerks('../bad'));await assert.rejects(service.getHeroPerks('constructor'));
});
test('perk service: 404/429/503, Retry-After seconds/date, provider-wide cooldown, timeout and CORS errors',async()=>{
 for(const status of [404,429,503]){let calls=0,clock=Date.parse('2026-11-07T00:00:00Z');const s=createPerkStatisticsService({now:()=>clock,fetcher:async()=>{calls++;return {ok:false,status,headers:{get:()=>status===503?'Sat, 07 Nov 2026 00:02:00 GMT':'120'}};}});
  await assert.rejects(s.getHeroPerks('genji'),new RegExp(`${status}`));await assert.rejects(s.getHeroPerks('genji'),/대기/);assert.equal(calls,1);
  if(status!==404){await assert.rejects(s.getHeroPerks('ana'),/대기/);assert.equal(calls,1);}clock+=120001;await assert.rejects(s.getHeroPerks('genji'));assert.equal(calls,2);
 }
 await assert.rejects(createPerkStatisticsService({timeoutMs:5,fetcher:()=>new Promise(()=>{})}).getHeroPerks('genji'),/초과/);
 await assert.rejects(createPerkStatisticsService({fetcher:async()=>{throw new TypeError('Failed to fetch')}}).getHeroPerks('genji'),/CORS/);
 await assert.rejects(createPerkStatisticsService({fetcher:async()=>reply({})}).getHeroPerks('genji'),/응답/);
});
async function domRun(run){const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://moonsh0206.github.io/HOW/#/heroes/genji'});const old={document:globalThis.document,window:globalThis.window,location:globalThis.location};Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});try{await run(dom.window);}finally{Object.assign(globalThis,old);dom.window.close();}}
test('perk view: captured percentages/counts, accessible bars, 0 distinct from unavailable, safe source and isolated error',()=>domRun(()=>{
 const item=identities.find(h=>h.key==='genji').minor[0],result=normalizePerkStatistics(raw,'genji');const ready={status:'ready',result};
 const present=state=>perkCardsForDetail('genji',{minor:[item]},state).minor[0];
 const el=renderPerkSelection(present(ready),ready);assert.match(el.textContent,/35.79%/);assert.match(el.textContent,/355/);assert.equal(el.querySelector('[role=meter]').getAttribute('aria-valuenow'),'35.79');
 const zero=clone(result);zero.entries[0].selectionRate=0;zero.entries[0].selectionCount=0;const zeroState={status:'ready',result:zero};assert.match(renderPerkSelection(present(zeroState),zeroState).textContent,/0.00%/);
 for(const [status,phrase]of [['loading','조회 중'],['error','불러오지 못했습니다'],['unavailable','미제공']]){const node=renderPerkSelection(present({status}),{status});assert.match(node.textContent,new RegExp(phrase));assert.equal(node.querySelector('[role=meter]'),null);}
 const info=renderPerkStatisticsInfo(ready);assert.match(info.textContent,/HOW 자체 집계/);assert.equal(info.querySelector('a').rel,'noopener noreferrer');const error=renderPerkStatisticsInfo({status:'error',error:'<img onerror=bad>'});assert.equal(error.querySelector('img'),null);assert(error.querySelector('[data-action=perk-stats-retry]'));
}));
test('perk routing: auto-load overview, no repeated calls on tabs/renders/filters, late hero responses ignored; main detail survives errors and retry',()=>domRun(async win=>{
 const detail=normalizeHeroDetail(detailRaw,'genji'),model=createHeroModel();model.state.heroes=[detail];let calls=0;const pending=new Map();
 const router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{getHero:async key=>({detail:{...detail,key},fetchedAt:'2026-11-07T00:00:00Z'})},perkStatisticsService:{getHeroPerks(key){calls++;return new Promise((resolve,reject)=>pending.set(key,{resolve,reject}));}}});
 const nav=async hash=>{location.hash=hash;win.dispatchEvent(new win.HashChangeEvent('hashchange'));await tick();await tick();};
 try{router.start();await tick();await tick();assert.equal(calls,1);await nav('#/heroes/genji/perks');assert.equal(calls,1);router.refresh();model.state.statsFilters.region='europe';router.refresh();assert.equal(calls,1);
  await nav('#/heroes/ana/perks');assert.equal(calls,2);pending.get('genji').resolve(normalizePerkStatistics(raw,'genji'));await tick();assert(!document.querySelector('#detail-minor').textContent.includes('35.79%'));
  pending.get('ana').reject(new Error('CORS'));await tick();assert.match(document.querySelector('#detail-perk-rates').textContent,/불러오지 못했습니다/);assert.equal(document.querySelector('#detail-abilities .ability-card')!==null,true);
  document.querySelector('[data-action=perk-stats-retry]').click();await tick();assert.equal(calls,3);await nav('#heroes');pending.get('ana').resolve(normalizeAllPerkStatistics(all).find(h=>h.heroKey==='ana'));await tick();assert.equal(document.querySelector('#hero-detail-page').hidden,true);
 }finally{router.stop();}
}));
test('perk detail: response updates existing Minor/Major cards without replacing descriptions or resetting other content',()=>domRun(()=>{
 const detail=normalizeHeroDetail(detailRaw,'genji'),model=createHeroModel();model.state.heroes=[detail];const view=createHeroDetailView(),state={status:'ready',result:{detail,fetchedAt:'2026-11-07T00:00:00Z'}},route={key:'genji',tab:'perks'};
 view.render(state,model,route);const card=document.querySelector('#detail-minor .ability-card'),description=card.querySelector('p'),abilities=document.querySelector('#detail-abilities');
 view.render(state,model,route,undefined,undefined,undefined,undefined,{status:'ready',result:normalizePerkStatistics(raw,'genji')});
 assert.equal(document.querySelector('#detail-minor .ability-card'),card);assert.equal(card.querySelector('p'),description);assert.equal(document.querySelector('#detail-abilities'),abilities);assert.equal(document.querySelectorAll('#detail-perk-rates').length,1);assert.equal(document.querySelectorAll('.perk-selection-bar').length,4);assert.match(card.textContent,/35.79%/);
}));
