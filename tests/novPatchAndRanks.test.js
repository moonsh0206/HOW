import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {CURRENT_PATCH_NOTE,currentHeroPatch} from '../src/data/currentPatchNote.js';
import {renderPatchNote} from '../src/views/patchNoteView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import roster from '../src/data/subroles.json' with {type:'json'};

test('Nov 4 retail patch: all 20 reviewed 5v5 hero changes and no stadium-only hero',()=>{
 const keys=Object.keys(CURRENT_PATCH_NOTE.heroChanges);
 assert.equal(keys.length,20);
 assert(keys.every(key=>Object.hasOwn(roster.heroes,key)));
 assert.equal(CURRENT_PATCH_NOTE.featuredHeroes.length,6);
 assert(CURRENT_PATCH_NOTE.featuredHeroes.every(key=>keys.includes(key)));
 assert(currentHeroPatch('junker-queen').details.some(d=>d.includes('375→425')));
 assert(currentHeroPatch('brigitte').details.some(d=>d.includes('12→15')));
 assert(currentHeroPatch('genji').details.some(d=>d.includes('2→1.5')));
 assert(!JSON.stringify(CURRENT_PATCH_NOTE.heroChanges).includes('스타디움'));
 assert(!JSON.stringify(CURRENT_PATCH_NOTE.heroChanges).includes('6대6'));
 assert(!JSON.stringify(CURRENT_PATCH_NOTE.heroChanges).includes('6v6'));
 // Cassidy and Sojourn have Stadium entries, but no standard hero balance entries in this patch.
 assert.equal(currentHeroPatch('cassidy'),null);
 assert.equal(currentHeroPatch('sojourn'),null);
 assert.equal(CURRENT_PATCH_NOTE.statisticsWindowStatus,'unverified');
});

test('main patch card: six highlights, expandable all-hero list, accessible official source',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{
  const card=renderPatchNote();
  assert.equal(card.querySelectorAll('.patch-highlights li').length,6);
  assert.equal(card.querySelectorAll('.patch-all-heroes li').length,20);
  assert.equal(card.querySelector('.patch-all-heroes').open,false);
  assert.equal(card.querySelector('a.patch-source').href,CURRENT_PATCH_NOTE.sourceUrl);
  assert.equal(card.querySelector('.patch-all-heroes a[href="#/heroes/genji"]').textContent.includes('겐지'),true);
  assert(card.textContent.includes('스타디움 전용 효과는 포함하지 않았습니다'));
  assert(card.querySelectorAll('script').length===0);
 }finally{globalThis.document=prior;dom.window.close();}
});

test('hero detail: review note only for actually patched hero, compact and kept separate from statistics',async()=>{
 const [html,rawText]=await Promise.all([
  readFile(new URL('../index.html',import.meta.url),'utf8'),
  readFile(new URL('./fixtures/overfast-genji.json',import.meta.url),'utf8')
 ]);
 const dom=new JSDOM(html,{url:'https://example.github.io/HOW/#/heroes/genji'});
 const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  const model=createHeroModel(),raw=JSON.parse(rawText),detail=normalizeHeroDetail(raw,'genji');
  model.state.heroes=[detail];
  const view=createHeroDetailView(),result={status:'ready',result:{detail,fetchedAt:'2026-11-04T00:00:00Z'}};
  view.render(result,model,{key:'genji',tab:'overview'});
  const patch=document.querySelector('.detail-patch-note');
  assert(patch);assert(patch.textContent.includes('튕겨내기'));
  assert(patch.textContent.includes('2→1.5'));assert.equal(patch.querySelector('a').href,CURRENT_PATCH_NOTE.sourceUrl);
  assert(document.querySelector('#detail-page-statistics').contains(patch)===false);
  assert(document.querySelector('#detail-page-statistics')!==null);
  view.render({status:'ready',result:{detail:{...detail,key:'ashe'},fetchedAt:'2026-11-04T00:00:00Z'}},model,{key:'ashe',tab:'overview'});
  assert.equal(document.querySelector('.detail-patch-note'),null);
 }finally{globalThis.document=previous;dom.window.close();}
});

test('all-rank workflow: scheduled collection covers 3 regions, originals and Pages refresh on completion',async()=>{
 const daily=await readFile(new URL('../.github/workflows/daily-snapshots.yml',import.meta.url),'utf8');
 const pages=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const collector=await readFile(new URL('../scripts/collect-division-batch.js',import.meta.url),'utf8');
 assert.match(daily,/schedule:/);assert.match(daily,/contents: write/);
 for(const region of ['asia','europe','americas'])assert(daily.includes(region));
 assert(daily.includes('node scripts/collect-division-batch.js'));
 assert.match(collector,/Incomplete batch/);
 assert.match(pages,/workflow_run:/);
 assert.match(pages,/Daily competitive all-rank snapshots/);
});
