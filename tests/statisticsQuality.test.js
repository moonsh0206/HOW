import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeStatistics,DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {normalizeBlizzardStatistics} from '../src/models/blizzardStatisticsModel.js';
import {rateStatus,qualitySummary} from '../src/models/statisticsQuality.js';
import {attachMetaTiers} from '../src/domain/meta.js';
import {combineDivisionStatistics} from '../src/models/compositeStatisticsModel.js';
import {buildMetricHistory,withCurrentMetricHistory} from '../src/models/pickHistoryModel.js';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {createHeroView} from '../src/views/heroView.js';
import {metricValue} from '../src/views/statisticsUI.js';
import {JSDOM} from 'jsdom';
const filters={...DEFAULT_FILTERS,division:'grandmaster'};
const raw=[{hero:'torbjorn',winrate:0,pickrate:20.9,banrate:0},{hero:'reaper',winrate:61.4,pickrate:10,banrate:0}];
test('provider conversion reproduction: -1 and real zero collapse upstream, explicit Blizzard adapter preserves the distinction',()=>{
 const legacy=value=>value===-1?0:value;assert.equal(legacy(-1),legacy(0));
 const selected={input:'PC',rq:'1',region:'Asia',map:'all-maps',tier:'Grandmaster'};
 const payload={rates:{selected,rates:[{id:'torbjorn',cells:{winrate:-1,pickrate:20.9,banrate:0}},{id:'reaper',cells:{winrate:0,pickrate:10,banrate:0}}]}};
 const [missing,zero]=normalizeBlizzardStatistics(payload,filters,{gamemodeKey:'1'});
 assert.equal(missing.winRate,null);assert.equal(rateStatus(missing,'winRate'),'confirmed-missing');assert.equal(missing.banRate,0);
 assert.equal(zero.winRate,0);assert.equal(rateStatus(zero,'winRate'),'available');assert.equal(zero.banRate,0);
 assert.equal(attachMetaTiers([{key:'torbjorn',role:'damage'}],[missing])[0].tier,null);
 assert(attachMetaTiers([{key:'reaper',role:'damage'}],[zero])[0].metaScore!==null);
 assert.throws(()=>normalizeBlizzardStatistics(payload,{...filters,region:'europe'},{gamemodeKey:'1'}));
 assert.throws(()=>normalizeStatistics([{hero:'ana',winrate:-1}]));
});
test('unconfirmed zero is preserved and warned, withheld from tier and win history rather than converted to missing',()=>{
 const records=normalizeStatistics(raw),heroes=[{key:'torbjorn',role:'damage'},{key:'reaper',role:'damage'}];
 assert.equal(records[0].winRate,0);assert.equal(rateStatus(records[0],'winRate'),'review');assert.equal(rateStatus(records[0],'banRate'),'available');
 const scored=attachMetaTiers(heroes,records);assert.equal(scored[0].tier,null);assert.equal(scored[0].metaScore,null);assert.equal(scored[0].roleRank,null);assert(scored[1].metaScore!==null);
 assert.match(metricValue(scored[0],'winRate'),/검토 중/);assert.equal(metricValue(scored[0],'banRate'),'0.0%');
 const snapshot={filters,collectedAt:'2026-11-04T00:00:00Z',patch:null,records};
 assert.equal(buildMetricHistory([snapshot],'torbjorn',filters,{all:true,metric:'winRate'}).points.length,0);
 assert.equal(buildMetricHistory([snapshot],'torbjorn',filters,{all:true,metric:'pickRate'}).points.length,1);
 const history=withCurrentMetricHistory({result:{points:[],segments:[]}}, {...snapshot,fetchedAt:snapshot.collectedAt},'torbjorn',filters,'winRate');assert.equal(history.result.points.length,0);
});
test('cumulative division reliability: GM suspicious zero blocks diamond_plus and master_plus; real verified zero can average',()=>{
 for(const division of ['diamond_plus','master_plus']){
  const base={...filters,division},parts=['diamond','master','grandmaster'].map(d=>({filters:{...filters,division:d},records:normalizeStatistics(d==='grandmaster'?raw:[{hero:'torbjorn',winrate:55,pickrate:10,banrate:0}])}));
  const row=combineDivisionStatistics(base,parts).find(r=>r.hero==='torbjorn');assert.equal(row.winRate,null);assert(Number.isFinite(row.pickRate));assert.equal(row.banRate,0);assert.deepEqual(row.reviewDivisions,['grandmaster']);assert.equal(attachMetaTiers([{key:'torbjorn',role:'damage'}],[row])[0].tier,null);
  parts[2].records=normalizeStatistics(raw,{source:'blizzard'});const verified=combineDivisionStatistics(base,parts).find(r=>r.hero==='torbjorn');assert(Number.isFinite(verified.winRate));assert.equal(verified.banRate,0);
  parts[2].records=normalizeStatistics([{hero:'torbjorn',winrate:-1,pickrate:20.9,banrate:0}],{source:'blizzard'});const missing=combineDivisionStatistics(base,parts).find(r=>r.hero==='torbjorn');assert.equal(missing.winRate,null);assert.deepEqual(missing.missingDivisions,['grandmaster']);
 }
});
test('clean captured cohorts preserve every existing score and tier; quality checks do not change valid data',async()=>{
 const evidence=JSON.parse(await readFile(new URL('../docs/research/tier-design/evidence.json',import.meta.url),'utf8'));
 for(const c of evidence.cases){const records=normalizeStatistics(c.api.records);assert.equal(qualitySummary(records).review,0);const old=records.map(r=>({hero:r.hero,winRate:r.winRate,pickRate:r.pickRate,banRate:r.banRate}));assert.deepEqual(attachMetaTiers(evidence.heroes.records,records),attachMetaTiers(evidence.heroes.records,old));}
});
test('captured current 54 hero response: 12 positive-pick zeros and four all-zero rows require review, not confirmed missing',async()=>{
 const data=JSON.parse(await readFile(new URL('../docs/research/zero-rate-audit/api.json',import.meta.url),'utf8')),records=normalizeStatistics(data),summary=qualitySummary(records);
 assert.equal(summary.total,54);assert.equal(summary.review,16);assert.equal(records.filter(r=>r.winRate===0&&r.pickRate>0).length,12);assert.equal(summary.confirmedMissing,0);assert.equal(summary.missing,0);assert(records.some(r=>r.banRate===0&&rateStatus(r,'banRate')==='available'));
});
test('two independent browser DOMs: identical response/cohort produces identical desktop/mobile values and classifications',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),data=JSON.parse(await readFile(new URL('../docs/research/zero-rate-audit/api.json',import.meta.url),'utf8')),heroes=normalizeHeroes(JSON.parse(await readFile(new URL('../docs/research/zero-rate-audit/heroes.json',import.meta.url),'utf8'))),previous=globalThis.document;
 const results=[];
 try{for(const width of [390,1440]){const dom=new JSDOM(html,{url:'https://example.test/HOW/'});Object.defineProperty(dom.window,'innerWidth',{value:width});globalThis.document=dom.window.document;
  const model=createHeroModel();Object.assign(model.state,{heroes,status:'ready',statsStatus:'ready',statsFilters:{...filters},statistics:{filters:{...filters},records:normalizeStatistics(JSON.parse(JSON.stringify(data))),fetchedAt:'2026-11-04T12:41:21.313Z',providerAgeSeconds:1985}});createHeroView().render(model);
  const scored=model.enrichedHeroes();assert.equal(scored.filter(h=>h.statistics?.quality?.fields?.winRate==='review').length,16);assert(scored.filter(h=>h.statistics?.quality?.fields?.winRate==='review').every(h=>h.tier===null));
  const table=[...document.querySelectorAll('#hero-rows tr')].map(r=>r.textContent),cards=[...document.querySelectorAll('#hero-cards .hero-card')].map(r=>r.textContent);assert.equal(table.length,54);assert.equal(cards.length,54);assert(table.some(t=>t.includes('0.0% · 검토 중')));assert(cards.some(t=>t.includes('0.0% · 검토 중')));assert.match(document.querySelector('#stats-timestamp').textContent,/1985초/);assert.match(document.querySelector('#stats-timestamp').textContent,/원본 집계 시각 미제공/);results.push(scored.map(h=>[h.key,h.tier,h.roleRank,h.metaScore]));dom.window.close();
 }}finally{globalThis.document=previous;}assert.deepEqual(results[0],results[1]);
});
