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
  const listeners=new Set();const media={matches:width<=767,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
  dom.window.matchMedia=()=>media;
  const model=createHeroModel(),cohort=evidence.cases.find(c=>c.filters.region==='asia'&&c.filters.division==='diamond');
  Object.assign(model.state,{heroes:evidence.heroes.records,status:'ready',statsFilters:cohort.filters,statsStatus:'ready',statistics:{filters:cohort.filters,records:normalizeStatistics(cohort.api.records),fetchedAt:cohort.api.fetchedAt,source:'OverFast API'}});
  const view=createInsightView();view.render(model);
  return {model,view,listenerCount:()=>listeners.size,resize(width){media.matches=width<=767;listeners.forEach(f=>f({matches:media.matches}));},close(){view.destroy();dom.window.close();Object.assign(globalThis,prior);}};
}
test('responsive insight DOM: one shared section moves between filter/roster and original desktop sidebar',()=>{
  const app=setup();
  try {
    const section=document.querySelector('.meta-insights'),originalStats=app.model.state.statistics;
    const expected=classifyMeta(app.model.enrichedHeroes());
    const original={};for(const category of ['highWinRate','popularPicks','contestedPicks'])original[category]=[...document.querySelectorAll(`[data-category="${category}"] .insight-hero`)].map(a=>a.hash);
    assert(section.closest('.sidebar'));assert([...section.querySelectorAll('.insight-details')].every(d=>d.open));
    for(const width of [320,360,375,390,430,600,601,768,1024,1440]) {
      app.resize(width);
      assert.equal(document.querySelectorAll('.meta-insights').length,1);
      assert.equal(document.querySelector('.meta-insights'),section);
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
      assert.equal(app.model.state.statistics,originalStats);
      if(width<=767){
        assert.equal(section.parentElement.id,'meta-insights-host');
        assert.equal(document.querySelector('#current-patch-note').previousElementSibling,document.querySelector('#heroes > .cohort-banner'));assert(document.querySelector('#current-patch-note').compareDocumentPosition(document.querySelector('#heroes .toolbar'))&4);
        assert.equal(document.querySelector('#heroes > .meta-insights'),null);
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
test('patch resize: original single node/link, open state and focus survive mobile/desktop moves; listener removed',()=>{
 const app=setup(1440);
 try{
  const patch=document.querySelector('#current-patch-note'),details=patch.querySelector('details'),summary=patch.querySelector('summary'),link=patch.querySelector('a'),href=link.href;
  details.open=true;summary.focus();
  for(const width of [390,601,320,768,600,1440]){
   app.resize(width);assert.equal(document.querySelectorAll('#current-patch-note').length,1);assert.equal(document.querySelector('#current-patch-note'),patch);assert(details.open);assert.equal(document.activeElement,summary);assert.equal(link.href,href);assert.equal(patch.querySelector('a'),link);assert.equal(app.listenerCount(),1);
   if(width<=767){assert.equal(patch.parentElement.id,'heroes');assert.equal(link.parentElement,details);assert.equal(patch.previousElementSibling.className,'cohort-banner');assert(patch.compareDocumentPosition(document.querySelector('#heroes .toolbar'))&4);}
   else{assert(patch.closest('.sidebar'));assert.equal(link.parentElement,patch);}
  }
  app.resize(390);const insight=document.querySelector('#gems-content details');insight.open=true;insight.querySelector('summary').focus();app.view.render(app.model);assert.equal(document.activeElement,document.querySelector('#gems-content summary'));assert(document.querySelector('#gems-content details').open);
  app.resize(768);app.resize(390);assert(document.querySelector('#gems-content details').open);
 }finally{app.close();assert.equal(app.listenerCount(),0);}
});
test('mobile insights: absent history/data stay unavailable; disclosure state survives statistics rerender',()=>{
  const app=setup(390);
  try{
    assert.equal(document.querySelector('#hot-content > p').textContent,'이전 기록 부족');
    assert.equal(document.querySelectorAll('#hot-content .insight-hero').length,0);
    const details=document.querySelector('[data-category="highWinRate"] details');details.open=true;app.view.render(app.model);
    assert(document.querySelector('[data-category="highWinRate"] details').open);
    for(const status of ['loading','error']){
      app.model.state.statsStatus=status;app.view.render(app.model);
      for(const category of ['highWinRate','popularPicks','contestedPicks']){
        const container=document.querySelector(`[data-category="${category}"]`);assert.equal(container.firstElementChild.textContent,status==='loading'?'통계 확인 중':'통계 연결 오류');assert.equal(container.querySelectorAll('.insight-hero').length,0);
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
    assert.deepEqual([...document.querySelectorAll('#hot-content .insight-hero')].map(a=>a.hash),desktop.map(a=>a.href));
    assert(document.querySelector('#hot-content .insight-hero small').textContent.includes('픽률 +2.0%p'));
    assert(document.querySelector('#hot-content details').textContent.includes('승률 변화 +1.0%p'));
    assert.equal(document.querySelector('#hot-content > .insight-hero').hash,desktop[0].href);
    assert.equal(JSON.stringify(current),before);
    assert.equal(document.querySelectorAll('#hot-content').length,1);
  }finally{app.close();}
});
