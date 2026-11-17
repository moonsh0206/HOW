import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setLanguage,t} from '../src/i18n/i18n.js';
import {renderPlayerRank} from '../src/views/playerRankView.js';
import {renderPlayerCardRanks} from '../src/views/playerCardRanksView.js';
import {mapDropdownOptions,MAP_MODE_LABELS} from '../src/views/filterOptions.js';
import {MAP_NAMES} from '../src/models/mapModel.js';
import {prepareChartMotion,preserveChartMotion} from '../src/views/chartMotion.js';
import {renderPickHistory} from '../src/views/pickHistoryView.js';
test('player rank labels resolve at render time for every rank in KO EN JA, including same-name cards',()=>{
 global.document=new JSDOM('').window.document;
 const keys={bronze:'브론즈',silver:'실버',gold:'골드',platinum:'플래티넘',emerald:'에메랄드',diamond:'다이아몬드',master:'마스터',grandmaster:'그랜드마스터',ultimate:'챔피언',champion:'챔피언'};
 for(const lang of ['ko','en','ja','ko']){setLanguage(lang);for(const [division,key]of Object.entries(keys)){
  const rank={division,tier:3,platform:'pc',role:'damage',season:1},before=JSON.stringify(rank);
  assert.equal(renderPlayerRank(rank).querySelector('strong').textContent,t(key)+' 3');
  assert(renderPlayerCardRanks({status:'ready',frame:{data:{ranks:[rank]}}},true).textContent.includes(t(key)+' 3'));
  assert.equal(JSON.stringify(rank),before);
 }}setLanguage('ko');
});
test('map group and selected-map labels follow live language without changing identifiers',()=>{
 for(const lang of ['ko','en','ja','ko']){setLanguage(lang);const options=mapDropdownOptions([{key:'busan'},{key:'esperanca'}],'busan');
  assert.equal(options.find(x=>x.value==='busan').label,MAP_NAMES.busan);
  assert.equal(options.find(x=>x.value==='busan').group,t('쟁탈'));assert.equal(MAP_MODE_LABELS.push,t('밀기'));
  if(lang==='ja'){assert.equal(MAP_NAMES.busan,'釜山');assert.equal(MAP_NAMES.esperanca,'エスペランサ');}
 }setLanguage('ko');
});
test('chart entry signature ignores unrelated renders and changes with actual data; missing charts have no entry',()=>{
 global.document=new JSDOM('').window.document;
 const a=document.createElement('section'),b=document.createElement('section');prepareChartMotion(a,['map',1]);prepareChartMotion(b,['map',1]);preserveChartMotion(a,b);assert.equal(b.dataset.chartEnter,'false');
 prepareChartMotion(b,['map',2]);preserveChartMotion(a,b);assert.equal(b.dataset.chartEnter,'true');
 const p=(time,value)=>({time,value,collectedAt:new Date(time).toISOString(),stored:true});const points=[p(100000,50),p(200000,51)];
 const chart=renderPickHistory({status:'ready',metric:'winRate',result:{points,segments:[[...points]],comparisonSegments:[[...points]],warnings:[]}},{});
 assert.equal(chart.querySelectorAll('.history-trace .history-segment').length,1);assert.equal(chart.querySelectorAll('.history-trace .history-comparison').length,1);assert.equal(chart.querySelectorAll('.history-dot').length,2);
 assert.equal(renderPickHistory({status:'ready',result:{points:[],segments:[],warnings:[]}},{}).dataset.chartEnter,undefined);
});
