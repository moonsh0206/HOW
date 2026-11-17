import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {topPlayerHeroes,normalizePlayerStats,normalizePlayerSummary} from '../src/models/playerModel.js';
import {createPlayerSearchController} from '../src/controllers/playerSearchController.js';
import {createOverfastPlayerProvider} from '../src/services/overfastPlayerProvider.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
const read=name=>JSON.parse(fs.readFileSync('docs/qa/player-search/'+name+'.json','utf8'));
const heroes=[{key:'ana',name:'아나',role:'support'},{key:'baptiste',name:'바티스트',role:'support'},{key:'cassidy',name:'캐서디',role:'damage'},{key:'lucio',name:'루시우',role:'support'},{key:'kiriko',name:'키리코',role:'support'}];
test('role filtering is metadata-only, independently scales time, preserves sorting, zero/missing and original data',()=>{
 const stats={heroes:[{key:'a',seconds:400},{key:'b',seconds:100},{key:'c',seconds:50},{key:'d',seconds:25},{key:'unknown',seconds:1000}]},metadata=[{key:'a',role:'tank'},{key:'b',role:'damage'},{key:'c',role:'support'},{key:'d',role:'support'}],before=JSON.stringify(stats);
 assert.deepEqual(topPlayerHeroes(stats,metadata).heroes.map(h=>h.key),['unknown','a','b','c','d']);assert.deepEqual(topPlayerHeroes(stats,metadata,'tank').heroes.map(h=>h.barPercent),[100]);assert.deepEqual(topPlayerHeroes(stats,metadata,'damage').heroes.map(h=>h.key),['b']);assert.deepEqual(topPlayerHeroes(stats,metadata,'support').heroes.map(h=>h.barPercent),[100,50]);assert.equal(JSON.stringify(stats),before);
 assert.equal(topPlayerHeroes({heroes:[{key:'a',seconds:null},{key:'c',seconds:0}]},metadata,'support').heroes[0].barPercent,null);assert.equal(topPlayerHeroes(stats,[],'tank').heroes.length,0);
});
function setup(){const dom=new JSDOM('<section id="player-search-page"></section>',{url:'https://example.com'});global.document=dom.window.document;const root=document.querySelector('section');let calls=0;const provider=createOverfastPlayerProvider({fetcher:async url=>{calls++;return {ok:true,status:200,headers:new Headers({'x-cache-ttl':'600'}),json:async()=>read(url.includes('/stats/')?'competitive':'summary')};}});const c=createPlayerSearchController({root,provider,heroes:()=>heroes});c.setActive(true);return {dom,root,c,calls:()=>calls,choose(role){const select=root.querySelector('#player-hero-role');select.value=role;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));}};}
test('one shared combo retains selection on same-player refresh/language/favorites and resets for another player',async()=>{
 const h=setup();await h.c.select('Public-1234');const trigger=h.root.querySelector('#player-hero-role-trigger');assert.equal(h.c.state.heroRole,'all');assert.equal(h.root.querySelectorAll('.player-hero-stats>li').length,5);
 h.root.querySelector('[data-player-hero=ana]').open=true;h.choose('support');assert(h.root.querySelector('[data-player-hero=ana]').open);assert.equal(h.root.querySelectorAll('.player-hero-stats>li').length,4);h.choose('damage');assert.equal(h.root.querySelectorAll('.player-hero-stats>li').length,1);assert.equal(h.root.querySelector('.player-time-bar').getAttribute('aria-valuenow'),'100');h.choose('tank');assert(h.root.querySelector('.player-role-empty'));h.choose('all');assert.equal(h.root.querySelector('[data-player-hero=ana]').open,false);
 h.choose('support');h.c.toggleFavorite('Public-1234');await h.c.select('Public-1234');assert.equal(h.c.state.heroRole,'support');assert.equal(h.calls(),2);assert.equal(h.root.querySelector('#player-hero-role-trigger'),trigger);assert.equal(h.root.querySelectorAll('#player-hero-role-listbox').length,1);
 setLanguage('ja');h.c.setRoute('Public-1234');assert.equal(h.root.querySelector('#player-hero-role').value,'support');assert(trigger.textContent.includes(t('지원')));assert(trigger.getAttribute('aria-label').includes(t('player.roleLabel')));setLanguage('ko');await h.c.select('Other-5678');assert.equal(h.c.state.heroRole,'all');assert.equal(h.calls(),4);h.c.stop();h.dom.window.close();
});
test('role combo keyboard, external close and disposal reuse the existing component behavior',async()=>{
 const h=setup();await h.c.select('Public-1234');const trigger=h.root.querySelector('#player-hero-role-trigger'),key=k=>trigger.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
 trigger.focus();key('Enter');assert.equal(trigger.getAttribute('aria-expanded'),'true');key('ArrowDown');key('ArrowDown');key('Enter');assert.equal(h.c.state.heroRole,'damage');assert.equal(document.activeElement,trigger);assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(h.calls(),2);
 key(' ');key('Escape');assert.equal(trigger.getAttribute('aria-expanded'),'false');key('Enter');document.body.dispatchEvent(new h.dom.window.Event('pointerdown',{bubbles:true}));assert.equal(trigger.getAttribute('aria-expanded'),'false');key('Enter');key('Tab');assert.equal(trigger.getAttribute('aria-expanded'),'false');h.c.stop();assert.equal(h.root.querySelector('#player-hero-role-trigger'),null);h.dom.window.close();
});
