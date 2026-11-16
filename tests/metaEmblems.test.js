import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {setLanguage} from '../src/i18n/i18n.js';
import {tierButton} from '../src/views/tierReasonView.js';
import {roleBadge,roleName} from '../src/views/roleIcon.js';
import {createHeroView} from '../src/views/heroView.js';
import {createHeroModel} from '../src/models/heroModel.js';

test('tier decoration preserves accessible grade, recommendation explanation and existing click targets',()=>{
 const dom=new JSDOM(),saved=globalThis.document;globalThis.document=dom.window.document;
 try{for(const lang of ['ko','en']){setLanguage(lang);
  for(const tier of ['S','A','B','C','D']){const button=tierButton({key:'ana',name:'Ana',tier});assert.equal(button.dataset.tier,'ana');assert.equal(button.type,'button');assert(button.getAttribute('aria-label').includes(tier));assert.equal(button.querySelector('svg').getAttribute('aria-hidden'),'true');assert.equal(button.querySelector('text').textContent,tier);}
  const conditional=tierButton({key:'ana',name:'Ana',tier:'A',recommendationGroup:'a-conditional'});assert(conditional.querySelector('.recommendation-label'));assert.match(conditional.title,lang==='ko'?/조건부/:/Conditional/);
  const missing=tierButton({key:'ana',name:'Ana',tier:null});assert.equal(missing.querySelector('svg'),null);assert(missing.textContent.length);
 }}finally{setLanguage('ko');globalThis.document=saved;dom.window.close();}
});

test('KO/EN role icons remain named; filters, favorites and card/table tier controls keep their semantics',async()=>{
 for(const lang of ['ko','en']){
  const dom=new JSDOM(await readFile('index.html','utf8'),{url:`https://example.org/HOW/${lang}/tiers`}),saved={document:globalThis.document,window:globalThis.window};Object.assign(globalThis,{document:dom.window.document,window:dom.window});setLanguage(lang);
  try{
   for(const role of ['tank','damage','support']){const badge=roleBadge(role);assert.equal(badge.getAttribute('role'),'img');assert.equal(badge.getAttribute('aria-label'),roleName(role));assert.equal(badge.title,roleName(role));assert.equal(badge.querySelector('.role-symbol').getAttribute('aria-hidden'),'true');}
   const model=createHeroModel(['ana']);Object.assign(model.state,{heroes:[{key:'ana',name:'Ana',role:'support'}],status:'ready',role:'support'});const view=createHeroView();view.render(model);
   const filter=document.querySelector('[data-role=support]');assert.equal(filter.getAttribute('aria-pressed'),'true');assert.equal(filter.getAttribute('aria-label'),roleName('support'));assert(filter.textContent.includes(roleName('support')));
   assert.equal(document.querySelector('.role-cell [role=img]').getAttribute('aria-label'),roleName('support'));assert(document.querySelector('#hero-cards [data-hero=ana]'));assert(document.querySelector('#favorite-preview [data-hero=ana]'));
   assert.equal(document.querySelector('#hero-cards [data-favorite=ana]').getAttribute('aria-pressed'),'true');
  }finally{setLanguage('ko');Object.assign(globalThis,saved);dom.window.close();}
 }
});
