import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {dashboardHistoryChart} from '../src/views/dashboardHistoryView.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const point=(day,value)=>({day,time:Date.parse(day+'T01:00:00Z'),value,count:2,targetCount:2});
test('role legend uses the actual common latest observation, rounds display only, preserves zero and does not reuse stale values',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en','ja']){setLanguage(lang);
  const data={available:true,series:[{role:'tank',points:[point('2026-11-20',51),point('2026-11-21',48.3456)]},{role:'damage',points:[point('2026-11-20',49),point('2026-11-21',null)]},{role:'support',points:[point('2026-11-21',0)]}]},before=structuredClone(data),chart=dashboardHistoryChart(data);
  assert.equal(chart.querySelector('[data-legend-role=tank] strong').textContent,'48.3%');assert.equal(chart.querySelector('[data-legend-role=damage] strong').textContent,t('미제공'));assert.equal(chart.querySelector('[data-legend-role=support] strong').textContent,'0.0%');assert.deepEqual(data,before);
  assert.equal(chart.querySelectorAll('.dashboard-dot').length,4);assert.equal(chart.querySelectorAll('.dashboard-legend>span').length,3);
 }}finally{globalThis.document=old;setLanguage('ko');dom.window.close();}
});
test('single and absent observations retain honest states and legends without generating a trend',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{const chart=dashboardHistoryChart({available:false,series:[{role:'tank',points:[point('2026-11-21',48.35)]}]});
  assert.equal(chart.querySelectorAll('.dashboard-dot').length,1);assert(!chart.querySelector('.dashboard-line').getAttribute('d').includes('L'));assert.equal(chart.querySelector('[data-legend-role=tank] strong').textContent,'48.4%');assert.equal(chart.querySelector('[data-legend-role=support] strong').textContent,t('미제공'));
  const empty=dashboardHistoryChart({available:false,series:[]});assert.equal(empty.querySelector('svg'),null);assert.equal(empty.querySelectorAll('.dashboard-legend strong').length,3);assert([...empty.querySelectorAll('.dashboard-legend strong')].every(e=>e.textContent===t('미제공')));
 }finally{globalThis.document=old;dom.window.close();}
});
