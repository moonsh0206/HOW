import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {formatPercentage,formatPercentagePoints} from '../src/views/statisticsUI.js';
import {buildMapComparison,mapComparisonScale} from '../src/models/mapComparisonModel.js';
import {renderMapStatistics} from '../src/views/mapStatisticsView.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const filters={platform:'pc',gamemode:'competitive',region:'asia',division:'diamond',map:'busan'};
const record=(winRate,pickRate,banRate)=>({hero:'genji',winRate,pickRate,banRate});
const base={source:'OverFast API',filters:{...filters,map:'all'},fetchedAt:'2026-11-17T01:00:00.000Z',patch:null,records:[record(52.123456,8.567891,.001234)]};
const current={...base,filters,records:[record(52.456789,8.123456,.000456)]};
const state={status:'ready',baseline:base},stats={statsFilters:filters,statsStatus:'ready',statistics:current};
test('map percentage format rounds only presentation, rejects nonfinite/missing, and retains true zero',()=>{
 setLanguage('ko');assert.equal(formatPercentage(52.456789,2),'52.46%');assert.equal(formatPercentage(8.123456,2),'8.12%');assert.equal(formatPercentage(0,2),'0.00%');
 for(const invalid of [null,undefined,NaN,Infinity,-1,101,'50'])assert.equal(formatPercentage(invalid,2),t('미제공'));
 const raw=buildMapComparison(state,stats,'genji','winRate');assert.equal(raw.difference,current.records[0].winRate-base.records[0].winRate);assert.equal(formatPercentagePoints(raw.difference),'+0.33%p');assert.equal(formatPercentagePoints(-.00001),'0.00%p');
});
test('map comparison keeps cohort/source/window compatibility, warnings for time drift and stale cache',()=>{
 const input=structuredClone({state,stats}),before=JSON.stringify(input);assert.equal(buildMapComparison(input.state,input.stats,'genji','winRate').status,'ready');assert.equal(JSON.stringify(input),before);
 for(const key of ['region','division','gamemode','map']){const bad={...base,filters:{...base.filters,[key]:{region:'europe',division:'master',gamemode:'quickplay',map:'busan'}[key]}};assert.equal(buildMapComparison({...state,baseline:bad},stats,'genji').status,'incompatible');}
 for(const extra of [{source:'untrusted'},{patch:'different'},{statisticsWindow:'since-patch-start'}])assert.equal(buildMapComparison({...state,baseline:{...base,...extra}},stats,'genji').status,'incompatible');
 const result=buildMapComparison({...state,baseline:{...base,fetchedAt:'2026-11-17T00:00:00Z',stale:true}},stats,'genji');assert.deepEqual(result.warnings,['different-time','stale']);
});
test('map comparison missing/review values never become zero; real ban zero and shared-axis small values remain accurate',()=>{
 const missing={...stats,statistics:{...current,records:[record(null,NaN,0)]}};
 assert.equal(buildMapComparison(state,missing,'genji','winRate').values[1],null);assert.equal(buildMapComparison(state,missing,'genji','pickRate').values[1],null);assert.equal(buildMapComparison(state,missing,'genji','banRate').values[1],0);
 const review={...stats,statistics:{...current,records:[record(0,8,0)]}};assert.equal(buildMapComparison(state,review,'genji','winRate').statuses[1],'review');assert.equal(buildMapComparison(state,review,'genji','winRate').difference,null);
 assert.equal(mapComparisonScale('winRate',[20,30]),100);assert.equal(mapComparisonScale('banRate',[.001234,.000456]),1);assert.equal(mapComparisonScale('pickRate',[0,0]),1);assert(mapComparisonScale('pickRate',[8.57,8.12])>=8.57);
});
test('KO/EN/JA graph pairs, labels, two-place precision, percentage-only tooltips, loading/error/missing and zero-height bars',()=>{
 const dom=new JSDOM('<body></body>'),previous=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en','ja']){setLanguage(lang);const model={state:stats},panel=renderMapStatistics(state,model,'genji',{metric:'winRate'});assert.deepEqual([...panel.querySelectorAll('.map-value')].map(e=>e.textContent),['52.12%','52.46%']);assert.match(panel.querySelector('.map-difference').textContent,/\+0\.33/);assert.equal(panel.querySelectorAll('.map-bar').length,2);assert.equal(panel.querySelector('.map-column').title,'52.12%');const column=panel.querySelector('.map-column');assert.equal(column.tabIndex,0);column.dispatchEvent(new dom.window.Event('focus'));assert.equal(panel.querySelector('.chart-value-tooltip').textContent,'52.12%');assert(panel.querySelector('figcaption').textContent===t('전체 전장'));
  const tiny=renderMapStatistics(state,model,'genji',{metric:'banRate'});assert(parseFloat(tiny.querySelector('.map-bar').style.height)<1);
  const zero=renderMapStatistics(state,{state:{...stats,statistics:{...current,records:[record(50,8,0)]}}},'genji',{metric:'banRate'});assert.equal(zero.querySelector('[data-series=selected] .map-value').textContent,'0.00%');assert.equal(zero.querySelector('[data-series=selected] .map-bar').style.height,'0%');
  for(const status of ['loading','error']){const node=renderMapStatistics({...state,status,error:'offline'},model,'genji');assert.equal(node.querySelectorAll('.map-bar').length,0);if(status==='loading')assert.equal(node.getAttribute('aria-busy'),'true');else assert(node.querySelector('[data-action=map-stats-retry]'));}
  const empty=renderMapStatistics({...state,baseline:{...base,records:[]}},{state:{...stats,statistics:{...current,records:[]}}},'genji');assert.equal(empty.querySelectorAll('.map-bar').length,0);assert(empty.textContent.includes(t('해당 맵 통계 미제공')));
  const currentError=renderMapStatistics(state,{state:{...stats,statsStatus:'error',statsError:'offline'}},'genji');assert.equal(currentError.querySelector('[data-map-stats-retry]').dataset.action,'stats-refresh');
 }}finally{globalThis.document=previous;dom.window.close();setLanguage('ko');}
});
