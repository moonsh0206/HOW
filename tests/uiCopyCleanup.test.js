import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setLanguage,t} from '../src/i18n/i18n.js';
import {renderPlayerSearch} from '../src/views/playerSearchView.js';
import {renderPerkStatisticsInfo} from '../src/views/perkStatisticsView.js';
import {dashboardHistoryChart} from '../src/views/dashboardHistoryView.js';

test('three languages keep short collection state, source and error controls without duplicate search guidance',()=>{
 const dom=new JSDOM('<section></section>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{for(const [language,collection]of [['ko','추이 데이터 수집 중'],['en','Collecting trend data'],['ja','推移データを収集中']]){
  setLanguage(language);assert.equal(t('dashboard.singleObservation'),collection);
  const root=document.querySelector('section');root.replaceChildren();renderPlayerSearch(root);assert.equal(root.querySelectorAll('.player-guide').length,1);assert(root.querySelector('#player-query'));assert(root.querySelector('.player-search-empty img'));
  const source=renderPerkStatisticsInfo({status:'error',error:'offline'});assert(source.querySelector('a').href.startsWith('https://'));assert(source.querySelector('[data-action=perk-stats-retry]'));assert(source.querySelector('details'));assert(source.textContent.includes(t('ui.independentPerks')));
  const chart=dashboardHistoryChart({available:false,series:[]});assert.equal(chart.querySelector('path'),null);
 }}finally{setLanguage('ko');globalThis.document=prior;dom.window.close();}
});
