import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {formatHistoryRate,renderMetricHistory} from '../src/views/pickHistoryView.js';

test('history display rounds only presentation, including current, ticks, tooltip, selection and table',()=>{
 const dom=new JSDOM('<body></body>'),previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  assert.equal(formatHistoryRate(14.633333333333333),'14.6');assert.equal(formatHistoryRate(0),'0.0');assert.equal(formatHistoryRate(null),'—');
  for(const metric of ['winRate','pickRate','banRate']){
   const point={value:14.633333333333333,time:Date.parse('2026-11-06T00:00:00Z'),collectedAt:'2026-11-06T00:00:00Z',stored:false,current:true};
   const state={status:'ready',metric,current:point,result:{points:[point],segments:[],warnings:[]}},before=structuredClone(state);
   const panel=renderMetricHistory(state);assert(panel.querySelector('.history-current').textContent.includes('14.6%'));
   assert(panel.querySelector('.history-point').getAttribute('aria-label').includes('14.6%'));
   assert(panel.querySelector('svg title').textContent.includes('14.6%'));
   assert(panel.querySelector('.history-table').textContent.includes('14.6%'));
   assert(!panel.textContent.includes('14.6333'));assert.deepEqual(state,before);
   assert.equal(panel.querySelectorAll('.history-info').length,1);assert.equal(panel.querySelector('.history-info').open,false);
  }
 }finally{globalThis.document=previous;dom.window.close();}
});
