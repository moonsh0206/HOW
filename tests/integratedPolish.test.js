import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {syncDashboardTextScale,dashboardHistoryChart} from '../src/views/dashboardHistoryView.js';
import {formatHistoryTimestamp} from '../src/views/pickHistoryView.js';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {normalizeStatistics} from '../src/models/statisticsModel.js';
import {originalProvenance} from '../src/models/statisticsProvenance.js';
import {dashboardSelection} from '../src/models/metaDashboardModel.js';
import {createMetaDashboardView} from '../src/views/metaDashboardView.js';
test('dashboard axis inverse scale preserves physical glyph proportions without changing observation coordinates',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{const data={available:false,series:[{role:'tank',points:[{day:'2026-11-20',time:Date.parse('2026-11-20T01:00:00Z'),value:48.3,count:2}]}]},before=structuredClone(data),chart=dashboardHistoryChart(data),svg=chart.querySelector('svg'),circle=svg.querySelector('circle'),coords=[circle.getAttribute('cx'),circle.getAttribute('cy')];
  for(const [width,height]of [[300,140],[580,210],[720,280]]){syncDashboardTextScale(svg,width,height);for(const text of svg.querySelectorAll('text')){const [x,y]=text.getAttribute('transform').match(/scale\(([^)]+)\)/)[1].split(' ').map(Number);assert(Math.abs(x*width/510-1)<1e-10);assert(Math.abs(y*height/220-1)<1e-10);}}
  assert.deepEqual([circle.getAttribute('cx'),circle.getAttribute('cy')],coords);assert.deepEqual(data,before);
 }finally{globalThis.document=old;dom.window.close();}
});
test('timestamps use actual KST midnight boundary and never fabricate invalid observation times',()=>{
 assert.equal(formatHistoryTimestamp('2026-11-22T15:00:00Z'),'2026.11.23 00:00 KST');assert.equal(formatHistoryTimestamp('2026-11-20T01:05:00Z'),'2026.11.20 10:05 KST');for(const v of [null,undefined,'invalid'])assert.equal(formatHistoryTimestamp(v),null);
});
test('rank-one emphasis and small flame follow valid sorted rank and the selected spotlight across rerenders',()=>{
 const dom=new JSDOM('<section id="dashboard-page"/>'),old=globalThis.document;globalThis.document=dom.window.document;let view;
 try{const evidence=JSON.parse(fs.readFileSync('docs/research/tier-design/evidence.json','utf8')),cohort=evidence.cases.find(c=>c.filters.region==='asia'&&c.filters.division==='diamond'),model=createHeroModel();Object.assign(model.state,{heroes:normalizeHeroes(evidence.heroes.records),status:'ready',statsStatus:'ready',statsFilters:cohort.filters,statistics:{filters:cohort.filters,records:normalizeStatistics(cohort.api.records),fetchedAt:cohort.api.fetchedAt,source:'OverFast API',provenance:originalProvenance(cohort.filters)}});
  const root=document.querySelector('#dashboard-page');view=createMetaDashboardView(root);const data=dashboardSelection(model),local={role:'all',days:7,mapKey:'busan',metric:'pickRate',history:{status:'idle'},map:{status:'idle'},maps:[]};
  for(const index of [1,2]){data.spotlight=data.sorted[index];view.render(model,local,data);const rows=root.querySelectorAll('.dashboard-ranking-table tbody tr');assert.equal(rows[0].dataset.dashboardRank,'1');assert.equal(root.querySelectorAll('.dashboard-row-flame').length,1);assert.equal(root.querySelector('.dashboard-row-flame').closest('tr').dataset.dashboardHero,data.spotlight.key);assert(root.querySelector('.dashboard-row-flame').src.endsWith('/assets/decorations/spotlight-flame.webp'));}
  assert.equal(root.querySelectorAll('.dashboard-ash').length,0);assert.equal(root.querySelectorAll('.dashboard-embers').length,1);assert.equal(root.querySelector('.dashboard-atmosphere').getAttribute('aria-hidden'),'true');
 }finally{view?.destroy();globalThis.document=old;dom.window.close();}
});
