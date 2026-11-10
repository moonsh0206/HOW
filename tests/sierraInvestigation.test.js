import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {normalizeHeroes,createHeroModel} from '../src/models/heroModel.js';
import {attachMetaTiers,percentile} from '../src/domain/meta.js';
import {applyRecommendationPolicy} from '../src/domain/recommendationPolicy.js';
import {createHeroView} from '../src/views/heroView.js';
const directory=new URL('../docs/research/sierra-tiers/2026-11-10T01-08-19-666Z/',import.meta.url);
const analysis=JSON.parse(await fs.readFile(new URL('analysis.json',directory),'utf8'));
const rosterRequest=analysis.requests.find(r=>new URL(r.url).pathname==='/heroes');
const heroes=normalizeHeroes(JSON.parse(await fs.readFile(new URL(rosterRequest.file,directory),'utf8')));
const filters={platform:'pc',region:'asia',gamemode:'competitive',map:'all',division:'diamond_plus'};
async function frames(){
 const requests=[];const service=createStatisticsService({fetcher:async url=>{
  requests.push(url);const captured=analysis.requests.find(r=>r.url===url);assert(captured,`Unexpected request ${url}`);
  return {ok:true,status:200,headers:new Headers(captured.headers),json:async()=>JSON.parse(await fs.readFile(new URL(captured.file,directory),'utf8'))};
 }});
 const composite=await service.getStatistics(filters);return {service,composite,requests};
}
test('captured Sierra: A/C/A to S follows metric averages then same-role percentiles, no plus API or score averaging',async()=>{
 const {service,composite,requests}=await frames();assert.equal(requests.length,3);assert(requests.every(u=>!u.includes('plus')));
 const sierra=attachMetaTiers(heroes,composite.records).map(applyRecommendationPolicy).find(h=>h.key==='sierra');
 assert.equal(sierra.roleSize,23);assert.equal(sierra.roleRank,3);assert.equal(sierra.provisionalTier,'S');assert.equal(sierra.tier,'S');assert(sierra.eligibility.every(r=>r.passed));assert(sierra.statistics.pickRate>=5);assert.equal(sierra.recommendationCapped,false);
 const tiers=[];for(const division of ['diamond','master','grandmaster']){const f=await service.getStatistics({...filters,division});tiers.push(attachMetaTiers(heroes,f.records).map(applyRecommendationPolicy).find(h=>h.key==='sierra').tier);}
 assert.deepEqual(tiers,['A','C','A']);assert.equal(requests.length,3);
 for(const field of ['winRate','pickRate','banRate'])assert.equal(sierra.statistics[field],composite.components.reduce((s,f)=>s+f.records.find(r=>r.hero==='sierra')[field],0)/3);
 assert(Math.abs(sierra.winPercentile-93.18181818181817)<1e-10);assert.equal(sierra.pickPercentile,50);assert(Math.abs(sierra.metaScore-76.7045454545)<1e-8);
 const damage=attachMetaTiers(heroes,composite.records).filter(h=>h.role==='damage');assert.equal(sierra.winPercentile,percentile(sierra.statistics.winRate,damage.map(h=>h.statistics.winRate)));
});
test('captured four cohorts: Model and table/card tiers agree, changed filters cannot reuse another cohort',async()=>{
 const {service,composite}=await frames(),html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://example.com/HOW/'}),old={window:globalThis.window,document:globalThis.document};Object.assign(globalThis,{window:dom.window,document:dom.window.document});
 try{const model=createHeroModel(),view=createHeroView();model.state.heroes=heroes;model.state.status='ready';
 for(const division of ['diamond','master','grandmaster','diamond_plus']){
  const frame=division==='diamond_plus'?composite:await service.getStatistics({...filters,division});Object.assign(model.state,{statsFilters:{...filters,division},statistics:frame,statsStatus:'ready'});view.render(model);
  const actual=model.heroByKey('sierra');assert.equal(actual.tier,analysis.results.find(r=>r.division===division).sierra.tier);
  const row=document.querySelector('#hero-rows [data-hero=sierra]').closest('tr'),card=document.querySelector('#hero-cards [data-hero=sierra]').closest('.hero-card');assert.equal(row.querySelector('.tier-badge').firstChild.textContent,actual.tier);assert.equal(card.querySelector('.tier-badge').firstChild.textContent,actual.tier);
 }
 model.state.statsFilters={...filters,region:'europe'};assert.equal(model.heroByKey('sierra').tier,null);
 }finally{dom.window.close();Object.assign(globalThis,old);}
});
