import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { buildMetricHistory, withCurrentMetricHistory } from '../src/models/pickHistoryModel.js';
import { DEFAULT_FILTERS } from '../src/models/statisticsModel.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createHeroModel } from '../src/models/heroModel.js';
import { createRoutingController } from '../src/controllers/routingController.js';
const now=Date.parse('2026-11-03T00:00:00Z');
const snapshot=(time,record,patch='p1')=>({collectedAt:time,filters:{...DEFAULT_FILTERS},patch,records:[{hero:'genji',...record}]});
test('three metric history: exact fields, zero/null, patch gaps, independent current values',()=>{
  const records=[snapshot('2026-11-02T00:00:00Z',{winRate:51,pickRate:12,banRate:0}),snapshot('2026-11-02T06:00:00Z',{winRate:52,pickRate:13,banRate:null})];
  for(const [metric,values] of [['winRate',[51,52]],['pickRate',[12,13]],['banRate',[0]]]){
    const result=buildMetricHistory(records,'genji',DEFAULT_FILTERS,{now,metric});
    assert.deepEqual(result.points.map(p=>p.value),values);
    assert.equal(result.segments.length,metric==='banRate'?0:1);
    const statistics={filters:DEFAULT_FILTERS,fetchedAt:'2026-11-02T12:00:00Z',records:[{hero:'genji',winRate:53,pickRate:14,banRate:1}]};
    const state=withCurrentMetricHistory({metric,result},statistics,'genji',DEFAULT_FILTERS,metric);
    assert.equal(state.current.value,statistics.records[0][metric]);assert.equal(state.result.segments.length,result.segments.length);
    assert.equal(buildMetricHistory(records.map(s=>({...s,patch:null})),'genji',DEFAULT_FILTERS,{now,metric}).segments.length,0);
  }
  assert.throws(()=>buildMetricHistory([],'genji',DEFAULT_FILTERS,{now,metric:'tier'}));
});

test('real snapshot: win/pick/ban series each match the stored observation without conversion',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/data/snapshots/index.json',import.meta.url)));
  const entry=manifest.snapshots[0],raw=JSON.parse(fs.readFileSync(new URL('../public/data/snapshots/'+entry.file,import.meta.url)));
  const record=raw.records.find(row=>row.hero==='genji');
  const observation={...raw,records:raw.records.map(row=>({hero:row.hero,winRate:row.winrate,pickRate:row.pickrate,banRate:row.banrate}))};
  for(const [metric,field] of [['winRate','winrate'],['pickRate','pickrate'],['banRate','banrate']]){
    const result=buildMetricHistory([observation],'genji',raw.filters,{now:Date.parse(raw.collectedAt)+1000,metric});
    assert.equal(result.points.length,1);assert.equal(result.points[0].value,record[field]);assert.equal(result.segments.length,0);
  }
});

test('dashboard: metric switching shares one archive request; passive appears only below counters',async()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/overfast-genji.json',import.meta.url),'utf8'));
  const dom=new JSDOM(html,{url:'https://example.com/HOW/#/heroes/genji'});
  const prior={window:globalThis.window,document:globalThis.document,location:globalThis.location};Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
  let router;try{
    const model=createHeroModel();model.state.heroes=[{key:'genji',name:'겐지',role:'damage',portrait:''}];
    model.state.statistics={filters:{...DEFAULT_FILTERS},fetchedAt:'2026-11-02T12:00:00Z',records:[{hero:'genji',winRate:53,pickRate:14,banRate:0}]};
    let calls=0;
    router=createRoutingController({model,detailService:{async getHero(key){return{detail:normalizeHeroDetail({...fixture,name:key},key),fetchedAt:new Date(now).toISOString()};}},detailView:createHeroDetailView(),historyService:{async getHistory(filters){calls++;return {snapshots:[{...snapshot('2026-11-02T00:00:00Z',{winRate:51,pickRate:12,banRate:2}),filters}],observedUntil:new Date(now).toISOString()};}}});
    const flush=()=>new Promise(resolve=>setImmediate(resolve));router.start();await flush();await flush();
    assert.equal(calls,1);assert.equal(document.querySelector('[data-history-metric="pickRate"]').getAttribute('aria-pressed'),'true');
    for(const [metric,label,current] of [['winRate','승률',53],['banRate','밴률',0],['pickRate','픽률',14]]){
      const button=document.querySelector(`[data-history-metric="${metric}"]`);button.focus();button.click();
      assert.equal(document.querySelector('#pick-history-title').textContent,`${label} · 패치별 변화`);
      assert.equal(document.querySelector(`[data-history-metric="${metric}"]`).getAttribute('aria-pressed'),'true');
      assert.equal(document.activeElement.dataset.historyMetric,metric);
      assert(document.querySelector('.history-current').textContent.includes(`${current}%`));
      assert(document.querySelector('svg[aria-label]').getAttribute('aria-label').includes(label));
      assert(document.querySelector('.history-table thead').textContent.includes(label));
      assert.equal(calls,1);
    }
    assert(document.querySelector('.detail-summary-main > .detail-metrics + #pick-history'));
    assert(document.querySelector('.detail-summary-side > .counter-panel + .synergy-panel + #detail-passives'));
    assert.equal(document.querySelectorAll('#detail-passives').length,1);
    assert.equal(document.querySelectorAll('#pick-history').length,1);
    assert(document.querySelector('.detail-summary [data-favorite="genji"]'));
    document.querySelector('[data-history-metric="winRate"]').click();
    assert.equal(document.querySelectorAll('[data-history-days],[data-history-scope]').length,0);
    model.state.statsFilters={...DEFAULT_FILTERS,region:'europe'};router.refresh();await flush();await flush();
    assert.equal(document.querySelector('#pick-history-title').textContent,'승률 · 패치별 변화');assert.equal(document.querySelector('.history-current'),null);
    location.hash='#/heroes/ana';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();await flush();
    assert.equal(document.querySelector('#pick-history-title').textContent,'픽률 · 패치별 변화');assert.equal(document.querySelectorAll('.history-point').length,0);
  }finally{router?.stop();dom.window.close();Object.assign(globalThis,prior);}
});
