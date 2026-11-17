import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderHeroPatch} from '../src/views/heroPatchView.js';
import {restorePatchDisclosure} from '../src/views/patchDisclosure.js';
import {setLanguage,t} from '../src/i18n/i18n.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
const actual=JSON.parse(fs.readFileSync('public/data/patches/notes.json','utf8'));
function setup(){const dom=new JSDOM('<main id="hero-detail-page"></main>');global.document=dom.window.document;const listeners=new Set(),media={matches:true,addEventListener(_,fn){listeners.add(fn);},removeEventListener(_,fn){listeners.delete(fn);}};dom.window.matchMedia=q=>q.includes('max-width')?media:{matches:false};return {dom,listeners,resize(mobile){media.matches=mobile;for(const fn of [...listeners])fn();}};}
function archive(count=1,type='buff',long=false,modes=false){const source=actual.patches.find(p=>p.changes.some(c=>c.heroKey==='genji')),base=source.changes.find(c=>c.heroKey==='genji');return {patches:[{...source,changes:[...Array.from({length:count},(_,i)=>({...base,id:'test-'+i,gameMode:'live-5v5',changeType:type,summaryKo:long?'긴 설명 '.repeat(30):'짧은 변경',heroKey:'genji'})),...(modes?['live-6v6','stadium'].map(mode=>({...base,id:mode,gameMode:mode,heroKey:'genji'})):[])]}]};}
test('mobile policy: short single stays visible, many/long collapse, all mode counts remain exact, missing creates nothing',()=>{
 const h=setup();setLanguage('ko');
 const single=renderHeroPatch(archive(),'genji');assert.equal(single.querySelector('.hero-patch-toggle'),null);assert.equal(single.querySelector('.hero-patch-body').hidden,false);
 for(const a of [archive(5),archive(3,'nerf'),archive(2,'mixed'),archive(1,'buff',true),archive(1,'buff',false,true)]){const card=renderHeroPatch(a,'genji');assert.equal(card.querySelector('.hero-patch-body').hidden,true);assert.equal(card.querySelector('.hero-patch-toggle').getAttribute('aria-expanded'),'false');assert.equal(Number(card.dataset.changeCount),a.patches[0].changes.length);card.querySelector('.hero-patch-toggle').click();assert.equal(card.querySelector('.hero-patch-body').hidden,false);card.patchDisclosure.dispose();}
 const many=renderHeroPatch(archive(5),'genji');assert.equal(many.querySelectorAll('[data-change-id]').length,5);assert.equal(many.querySelector('.hero-patch-more').open,false);
 assert.equal(renderHeroPatch(actual,'kiriko'),null);h.dom.window.close();
});
test('upper state, focus, breakpoint and KO EN JA labels remain accessible and independent',()=>{
 const h=setup();for(const lang of ['ko','en','ja']){setLanguage(lang);const card=renderHeroPatch(archive(5),'genji');document.body.append(card);const body=card.querySelector('.hero-patch-body'),button=card.querySelector('.hero-patch-toggle');assert.equal(button.getAttribute('aria-controls'),body.id);assert(button.textContent.includes(t('patch.viewDetails')));button.click();const inner=card.querySelector('.hero-patch-more');inner.open=true;inner.querySelector('summary').focus();button.click();assert.equal(document.activeElement,button);assert.equal(body.inert,true);assert(inner.open);h.resize(false);assert.equal(body.hidden,false);assert.equal(body.inert,false);assert.equal(button.getAttribute('aria-expanded'),'true');h.resize(true);assert.equal(body.hidden,true);button.click();const next=renderHeroPatch(archive(6),'genji');restorePatchDisclosure(card,next);assert.equal(next.patchDisclosure.open,true);assert.equal(next.querySelector('.hero-patch-body').hidden,false);assert.equal(h.listeners.size,1);next.patchDisclosure.dispose();card.remove();}
 setLanguage('ko');h.dom.window.close();
});
test('hero detail rerenders preserve upper and keyed inner disclosures; a new hero has its own initial state',()=>{
 const h=setup(),model=createHeroModel(),view=createHeroDetailView(),raw=JSON.parse(fs.readFileSync('tests/fixtures/overfast-genji.json','utf8'));
 const detail={status:'ready',result:{detail:normalizeHeroDetail(raw,'genji'),fetchedAt:'2026-11-17T00:00:00Z'}},data=archive(5,'nerf',false,true);
 const render=(metric='pickRate',key='genji',patches=data)=>view.render(detail,model,{key,tab:'overview'},undefined,{status:'ready',metric,days:7},undefined,undefined,undefined,patches);
 render();document.querySelector('.hero-patch-toggle').click();document.querySelector('.hero-patch-more').open=true;document.querySelector('.hero-patch-mode').open=true;document.querySelector('.hero-patch-toggle').focus();render('winRate');assert.equal(document.querySelector('.hero-patch-body').hidden,false);assert(document.querySelector('.hero-patch-more').open);assert(document.querySelector('.hero-patch-mode').open);assert.equal(document.activeElement,document.querySelector('.hero-patch-toggle'));
 const updated=archive(6,'mixed',true,true);render('banRate','genji',updated);assert.equal(document.querySelectorAll('[data-change-id]').length,8);assert.equal(document.querySelector('.hero-patch-body').hidden,false);
 detail.result.fetchedAt='2026-11-17T01:00:00Z';render('pickRate','genji',updated);assert.equal(document.querySelector('.hero-patch-body').hidden,false);assert(document.querySelector('.hero-patch-more').open);
 const other=structuredClone(updated);other.patches[0].changes.forEach(c=>c.heroKey='ana');render('pickRate','ana',other);assert.equal(document.querySelector('.hero-patch-body').hidden,true);assert.equal(h.listeners.size,1);h.dom.window.close();
});
