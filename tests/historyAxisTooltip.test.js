import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {historyDateLabels} from '../src/views/historyAxis.js';
import {renderMetricHistory} from '../src/views/pickHistoryView.js';
import {rankChangeMarker} from '../src/views/rankChangeView.js';
import {setLanguage} from '../src/i18n/i18n.js';
const points=(count,start='2026-09-01T01:00:00Z')=>Array.from({length:count},(_,i)=>{const time=Date.parse(start)+i*86400000;return {time,collectedAt:new Date(time).toISOString(),value:50+i/100,stored:true};});
test('date labels use actual KST observations, adapt at 7/30/90 days and preserve originals',()=>{
 for(const count of [1,7,30,100])for(const width of [220,600]){
  const input=points(count),before=structuredClone(input),labels=historyDateLabels(input,width);
  assert(labels.length);assert(labels.length<=input.length);assert.deepEqual(input,before);
  for(const label of labels)assert.equal(label.text,new Date(input[label.index].time).toISOString().slice(5,10).replace('-','/'));
  for(let i=1;i<labels.length;i++)assert((labels[i].x-labels[i-1].x)*width/600>=52);
 }
 assert.equal(historyDateLabels(points(7),600).length,7);
 assert(historyDateLabels(points(100),220).length<historyDateLabels(points(100),600).length);
 assert(historyDateLabels(points(4,'2026-12-30T01:00:00Z')).every(p=>/^202[67]\//.test(p.text)));
 assert.equal(historyDateLabels([{time:Date.parse('2026-11-20T16:00:00Z')}])[0].text,'11/21');
 const gaps=points(3).filter((_,i)=>i!==1);assert.deepEqual(historyDateLabels(gaps).map(p=>p.text),['09/01','09/03']);
});
test('point tooltips expose percentages and actual timestamps on hover, touch and keyboard, preserving all points and values',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en','ja']){setLanguage(lang);for(const metric of ['winRate','pickRate','banRate']){
  const data=points(30),before=structuredClone(data),panel=renderMetricHistory({status:'ready',metric,days:30,result:{points:data,segments:[],warnings:[]}});document.body.replaceChildren(panel);
  const marks=panel.querySelectorAll('.history-point'),tip=panel.querySelector('.chart-value-tooltip');assert.equal(marks.length,30);assert(tip.hidden);
  for(const event of ['pointerenter','click','focus']){marks[5].dispatchEvent(new dom.window.Event(event));assert.equal(tip.textContent.split('\n')[0],'50.0%');assert(tip.textContent.includes('2026.09.06 10:00 KST'));assert(!tip.hidden);}
  assert.equal(marks[5].querySelector('title').textContent,tip.textContent);assert(panel.querySelector('.history-last-observed').textContent.includes('2026.09.30 10:00 KST'));assert.equal((panel.querySelector('.history-last-observed').textContent.match(/KST/g)??[]).length,1);assert(panel.querySelectorAll('.history-x span').length<30);
  panel.querySelector('.history-graph').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(tip.hidden);assert.deepEqual(data,before);
  assert.equal(panel.querySelectorAll('.history-table tbody tr').length,30);
 }}}
 finally{globalThis.document=old;setLanguage('ko');dom.window.close();}
});
test('rank markers provide translated, keyboard-accessible previous/current daily positions',()=>{
 const dom=new JSDOM('<body/>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en','ja']){setLanguage(lang);for(const [previousRank,currentRank,expected]of [[5,3,'▲2'],[2,3,'▼1'],[3,3,'=']]){
  const marker=rankChangeMarker({delta:previousRank-currentRank,previousRank,currentRank,basis:'daily-observation',previousAt:'2026-11-20T01:00:00Z',currentAt:'2026-11-21T01:00:00Z'});
  assert.equal(marker.firstChild.textContent,expected);assert.equal(marker.tabIndex,0);assert(marker.getAttribute('aria-label').includes(String(previousRank)));assert(marker.title.includes('2026'));
 }}}
 finally{globalThis.document=old;setLanguage('ko');dom.window.close();}
});
