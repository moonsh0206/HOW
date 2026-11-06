import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createInsightView } from '../src/views/insightView.js';
import { createHeroModel } from '../src/models/heroModel.js';
import { normalizeStatistics } from '../src/models/statisticsModel.js';
import { classifyMeta } from '../src/domain/insights.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const evidence=JSON.parse(fs.readFileSync(new URL('../docs/research/tier-design/evidence.json',import.meta.url),'utf8'));
function setup(width=1440) {
  const dom=new JSDOM(html,{url:'https://example.github.io/HOW/'});
  const prior={window:globalThis.window,document:globalThis.document};
  Object.assign(globalThis,{window:dom.window,document:dom.window.document});
  const listeners=new Set();const media={matches:width<=600,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
  dom.window.matchMedia=()=>media;
  const model=createHeroModel(),cohort=evidence.cases.find(c=>c.filters.region==='asia'&&c.filters.division==='diamond');
  Object.assign(model.state,{heroes:evidence.heroes.records,status:'ready',statsFilters:cohort.filters,statsStatus:'ready',statistics:{filters:cohort.filters,records:normalizeStatistics(cohort.api.records),fetchedAt:cohort.api.fetchedAt,source:'OverFast API'}});
  const view=createInsightView();view.render(model);
  return {model,view,resize(width){media.matches=width<=600;listeners.forEach(f=>f({matches:media.matches}));},close(){view.destroy();dom.window.close();Object.assign(globalThis,prior);}};
}
test('responsive insight DOM: one shared section moves between filter/roster and original desktop sidebar',()=>{
  const app=setup();
  try {
    const section=document.querySelector('.meta-insights'),originalStats=app.model.state.statistics;
    const expected=classifyMeta(app.model.enrichedHeroes());
    const original={};for(const category of ['highWinRate','popularPicks','contestedPicks'])original[category]=[...document.querySelectorAll(`[data-category="${category}"] .insight-hero`)].map(a=>a.hash);
    assert(section.closest('.sidebar'));assert([...section.querySelectorAll('.insight-details')].every(d=>d.open));
    for(const width of [320,375,390,430,600,768,1440]) {
      app.resize(width);
      assert.equal(document.querySelectorAll('.meta-insights').length,1);
      assert.equal(document.querySelector('.meta-insights'),section);
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
      assert.equal(app.model.state.statistics,originalStats);
      if(width<=600){
        assert.equal(section.previousElementSibling,document.querySelector('#heroes > .cohort-banner'));
        assert(section.compareDocumentPosition(document.querySelector('#table-wrap'))&4);
        assert([...section.querySelectorAll('.insight-details')].every(d=>!d.open));
        for(const [category,field,label] of [['highWinRate','winRate','승률'],['popularPicks','pickRate','픽률'],['contestedPicks','banRate','밴률']]){
          const top=[...expected[category]].sort((a,b)=>b.statistics[field]-a.statistics[field]||a.key.localeCompare(b.key))[0];
          const container=document.querySelector(`[data-category="${category}"]`);
          assert.equal(container.firstElementChild.hash,`#/heroes/${top.key}`);
          assert.equal(container.firstElementChild.querySelector('small').textContent,`${label} ${top.statistics[field].toFixed(1)}%`);
        }
      } else {
        assert(section.closest('.sidebar'));assert([...section.querySelectorAll('.insight-details')].every(d=>d.open));
        for(const [category,links] of Object.entries(original))assert.deepEqual([...document.querySelectorAll(`[data-category="${category}"] .insight-hero`)].map(a=>a.hash),links);
      }
    }
  }finally{app.close();}
});
test('mobile insights: absent history/data stay unavailable; disclosure state survives statistics rerender',()=>{
  const app=setup(390);
  try{
    assert.equal(document.querySelector('#hot-content > p').textContent,'미제공');
    assert.equal(document.querySelectorAll('#hot-content .insight-hero').length,0);
    const details=document.querySelector('[data-category="highWinRate"] details');details.open=true;app.view.render(app.model);
    assert(document.querySelector('[data-category="highWinRate"] details').open);
    for(const status of ['loading','error']){
      app.model.state.statsStatus=status;app.view.render(app.model);
      for(const category of ['highWinRate','popularPicks','contestedPicks']){
        const container=document.querySelector(`[data-category="${category}"]`);assert.equal(container.firstElementChild.textContent,'미제공');assert.equal(container.querySelectorAll('.insight-hero').length,0);
      }
    }
  }finally{app.close();}
});
test('mock history: HOT values and hero links are shared across desktop/mobile without mutating data',()=>{
  const app=setup(1440);
  try{
    const current=app.model.state.statistics;
    app.model.state.previousSnapshot={source:'OverFast API',filters:{...current.filters},collectedAt:new Date(Date.parse(current.fetchedAt)-86400000).toISOString(),records:current.records.map(r=>({...r,pickRate:Math.max(0,(r.pickRate??0)-2),winRate:r.winRate==null?null:r.winRate-1}))};
    const before=JSON.stringify(current);app.view.render(app.model);
    const desktop=[...document.querySelectorAll('#hot-content .insight-hero')].map(a=>({href:a.hash,metric:a.querySelector('small').textContent}));
    assert(desktop.length>0);
    app.resize(390);
    assert.deepEqual([...document.querySelectorAll('#hot-content .insight-hero')].map(a=>({href:a.hash,metric:a.querySelector('small').textContent})),desktop);
    assert.equal(document.querySelector('#hot-content > .insight-hero').hash,desktop[0].href);
    assert.equal(JSON.stringify(current),before);
    assert.equal(document.querySelectorAll('#hot-content').length,1);
  }finally{app.close();}
});
