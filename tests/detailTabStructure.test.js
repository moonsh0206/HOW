import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createHeroModel} from '../src/models/heroModel.js';

test('detail tabs own content: banner -> tabs -> overview metrics, ordered mobile content, isolated abilities/perks',()=>{
 const dom=new JSDOM('<main id="hero-detail-page"></main>'),previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/overfast-genji.json',import.meta.url))),archive=JSON.parse(fs.readFileSync(new URL('../public/data/patches/notes.json',import.meta.url)));
  const state={status:'ready',result:{detail:normalizeHeroDetail(raw,'genji'),fetchedAt:'2026-11-09T00:00:00Z'}},model=createHeroModel(),view=createHeroDetailView();
  const render=tab=>view.render(state,model,{key:'genji',tab},undefined,undefined,undefined,undefined,undefined,archive);
  render('overview');const root=document.querySelector('#hero-detail-page'),tabs=root.querySelector('.detail-tabs'),overview=root.querySelector('#detail-overview');
  assert(tabs.previousElementSibling.matches('.detail-hero'));assert.equal(tabs.nextElementSibling,overview);
  const grid=overview.querySelector('.detail-overview-grid');assert.deepEqual([...grid.children].map(e=>e.classList.contains('detail-metrics')?'metrics':e.classList.contains('hero-patch-panel')?'patch':e.classList.contains('detail-summary-main')?'main':e.classList.contains('counter-panel')?'counter':e.classList.contains('synergy-panel')?'synergy':e.id),['metrics','patch','main','counter','synergy','detail-passives']);
  assert.equal(grid.querySelectorAll('.detail-metrics>div').length,4);assert(root.querySelector('#detail-abilities').hidden);assert(root.querySelector('#detail-minor').hidden);
  const perkCard=root.querySelector('#detail-minor .ability-card');
  render('abilities');assert(overview.hidden);assert(!root.querySelector('#detail-abilities').hidden);assert(root.querySelector('#detail-abilities #detail-passives'));assert.equal(root.querySelectorAll('#detail-passives').length,1);
  render('perks');assert(overview.hidden);assert(root.querySelector('#detail-abilities').hidden);assert(!root.querySelector('#detail-minor').hidden);assert.equal(root.querySelector('#detail-minor .ability-card'),perkCard);
  render('overview');assert(!overview.hidden);assert(root.querySelector('.detail-overview-grid>#detail-passives'));assert.equal(root.querySelectorAll('#pick-history').length,1);assert.equal(root.querySelectorAll('#detail-passives').length,1);
 }finally{globalThis.document=previous;dom.window.close();}
});
