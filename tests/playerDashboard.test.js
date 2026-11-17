import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {normalizePlayerStats,normalizePlayerSummary} from '../src/models/playerModel.js';
import {renderPlayerOverview,renderPlayerHeroList,playerWinLoss} from '../src/views/playerDashboardView.js';
import {createPlayerSearchView} from '../src/views/playerSearchView.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const raw=JSON.parse(fs.readFileSync('docs/qa/player-search/competitive.json','utf8')),summary=JSON.parse(fs.readFileSync('docs/qa/player-search/summary.json','utf8'));
const frame=data=>({data,fetchedAt:'2026-11-17T01:00:00Z',cached:true,providerStale:true});
const setup=()=>{const dom=new JSDOM('<section id="player-search-page"></section>',{url:'https://example.com'});global.document=dom.window.document;return dom;};
test('summary retains real totals/per-10-minute averages; no win-loss or game-count reconstruction',()=>{
 const before=JSON.stringify(raw),stats=normalizePlayerStats(raw);assert.equal(stats.general.average.damage,4300.92);assert.equal(stats.heroes.find(h=>h.key==='ana').total.healing,89965);assert.equal(JSON.stringify(raw),before);
 const odd=normalizePlayerStats({general:{games_played:10,games_won:3,games_lost:4,winrate:57.123,kda:2,total:{deaths:0,damage:-1},average:{healing:NaN}},heroes:{}}).general;
 assert.equal(odd.played,10);assert.equal(odd.won,3);assert.equal(odd.lost,4);assert.equal(odd.winRate,57.123);assert.equal(odd.total.deaths,0);assert.equal(odd.total.damage,null);assert.equal(odd.average.healing,null);
});
test('KPI rounding and same-hero records preserve missing versus zero in KO EN JA',()=>{
 const dom=setup();for(const lang of ['ko','en','ja']){setLanguage(lang);const row={played:10,won:3,lost:4,winRate:57.123,kda:2,seconds:60};const grid=renderPlayerOverview(row);assert.equal(grid.querySelector('.player-winrate strong').textContent,'57.1%');assert.equal(grid.querySelector('.player-win-loss').textContent,t('player.record',{won:'3',lost:'4'}));assert.equal(grid.children[2].querySelector('strong').textContent,'10');assert.equal(playerWinLoss({won:null,lost:4}),null);assert.equal(renderPlayerOverview({winRate:0,won:0,lost:0}).querySelector('.player-winrate strong').textContent,'0.0%');assert.equal(renderPlayerOverview({winRate:null}).querySelector('.player-winrate strong').textContent,t('미제공'));}setLanguage('ko');dom.window.close();
});
test('hero analysis uses only its own summary fields, fixed time ratios and API per-10-minute units',()=>{
 const dom=setup(),stats=normalizePlayerStats(raw),list=renderPlayerHeroList(stats,[{key:'ana',name:'아나',role:'support'}]);assert.equal(list.children.length,5);assert.equal(list.children[0].dataset.heroKey,'baptiste');assert.equal(list.querySelector('.player-time-bar').getAttribute('aria-valuenow'),'100');
 const ana=list.querySelector('[data-hero-key=ana]');assert.equal(ana.querySelector('.player-hero-winrate .player-win-loss').textContent,'3승 5패');assert(ana.querySelector('.player-hero-analysis').textContent.includes('89,965'));assert(ana.textContent.includes(t('player.per10')));assert.equal(ana.querySelector('details').open,false);const meter=Number(ana.querySelector('[role=meter]').getAttribute('aria-valuenow'));assert.equal(meter,5363/6056*100);dom.window.close();
});
test('native hero analysis survives language/favorite rerenders and resets on player change; no extra API calls',async()=>{
 const dom=setup();let calls=0;const root=document.querySelector('section'),c=createPlayerSearchController({root,provider:{summary:async()=>{calls++;return frame(normalizePlayerSummary(summary));},competitive:async()=>{calls++;return frame(normalizePlayerStats(raw));}}});c.setActive(true);await c.select('Public-1234');const open=()=>root.querySelector('[data-player-hero=ana]');open().open=true;open().querySelector('summary').focus();c.toggleFavorite('Public-1234');assert(open().open);assert.equal(document.activeElement,open().querySelector('summary'));assert.equal(calls,2);
 setLanguage('ja');c.setRoute('Public-1234');assert(open().open);assert.equal(open().querySelector('.player-hero-winrate .player-win-loss').textContent,'3勝 5敗');assert.equal(calls,2);setLanguage('ko');await c.select('Other-5678');assert.equal(open().open,false);assert.equal(calls,4);c.stop();dom.window.close();
});
test('private, unranked, no records and partial failures do not invent personal records',()=>{
 const dom=setup(),root=document.querySelector('section'),view=createPlayerSearchView(root),state={mode:'profile',selected:{id:'Private',name:'Private'},results:[],favorites:new Map(),summary:frame(normalizePlayerSummary({...summary,competitive:null})),competitive:frame(normalizePlayerStats(raw)),searchStatus:'idle',private:true};view.render(state);assert.equal(root.querySelector('.player-dashboard'),null);assert(root.textContent.includes(t('player.private')));
 state.private=false;state.competitive=frame({general:null,heroes:[]});state.profileError='timeout';view.render(state);assert.equal(root.querySelectorAll('.player-overview>.player-stat-cell').length,4);assert.equal(root.querySelectorAll('.player-hero-stats li').length,0);assert(root.textContent.includes(t('player.noHeroRecords')));assert(root.querySelector('[data-player-retry]'));assert.equal(root.querySelectorAll('.player-ranks .player-rank img').length,0);
 state.summary=frame(normalizePlayerSummary({...summary,competitive:{pc:{season:22,tank:{division:'diamond',tier:3}},console:{season:21,support:{division:'ultimate',tier:2}}}}));view.render(state);assert.equal(root.querySelectorAll('.player-rank-grid').length,2);assert.equal(root.querySelector('[data-division=ultimate] strong').textContent,t('챔피언')+' 2');assert.deepEqual([...root.querySelector('.player-rank-grid').children].map(el=>el.querySelector('small').textContent),['PC · 돌격','PC · 공격','PC · 지원']);dom.window.close();
});
