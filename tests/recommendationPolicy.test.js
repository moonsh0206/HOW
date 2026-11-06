import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {applyRecommendationPolicy,recommendationOrder,recommendationDescription} from '../src/domain/recommendationPolicy.js';
import {attachMetaTiers} from '../src/domain/meta.js';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {tierButton} from '../src/views/tierReasonView.js';
import {createHeroCard} from '../src/views/heroView.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {compareStoredPolicies} from '../scripts/report-meta-v21.js';
const hero=(tier,pickRate)=>({key:'example',name:'예시',role:'damage',tier,statistics:{winRate:55,pickRate,banRate:0},metaScore:80,roleRank:1});
test('v2.1: S cap, A boundaries, immutable score/rank and unchanged B/C/D',()=>{
 for(const [pick,group] of [[2.99,'a-low'],[3,'a-conditional'],[4.99,'a-conditional'],[5,'a-standard']]){
  const base=hero('S',pick),result=applyRecommendationPolicy(base);
  assert.equal(result.tier,pick<5?'A':'S');assert.equal(result.metaScore,80);assert.equal(result.roleRank,1);assert.equal(base.tier,'S');
  assert.equal(applyRecommendationPolicy(hero('A',pick)).recommendationGroup,group);
 }
 for(const tier of ['B','C','D',null])assert.equal(applyRecommendationPolicy(hero(tier,1)).tier,tier);
 assert.match(recommendationDescription(applyRecommendationPolicy(hero('A',2.99))),/추가 검토/);
});
test('v2.1: existing S requirements and missing/review exclusion survive',()=>{
 const heroes=Array.from({length:8},(_,i)=>({key:`h${i}`,role:'damage'}));
 const rows=heroes.map((h,i)=>({hero:h.key,winRate:60-i,pickRate:10+i,banRate:8-i}));
 rows[0].quality={fields:{winRate:'review'}};rows[1].winRate=null;
 const base=attachMetaTiers(heroes,rows),after=base.map(applyRecommendationPolicy);
 assert.equal(after[0].tier,null);assert.equal(after[1].tier,null);
 for(const h of after)if(h.tier==='S')assert(h.eligibility.every(r=>r.passed));
 assert.equal(applyRecommendationPolicy(hero('A',20)).tier,'A');
});
test('v2.1: all stored originals/derived cohorts preserve v2 scores/ranks and expected November 6 results',async()=>{
 const cohorts=await compareStoredPolicies();assert(cohorts.length>=48);
 const asia=cohorts.find(c=>c.filters.region==='asia'&&c.filters.division==='diamond_plus');
 const rat=asia.heroes.find(h=>h.key==='junkrat'),shion=asia.heroes.find(h=>h.key==='shion'),domina=asia.heroes.find(h=>h.key==='domina');
 assert.equal(rat.before,'S');assert.equal(rat.after,'A');assert.equal(rat.group,'a-conditional');
 assert.equal(shion.group,'a-standard');assert.equal(domina.group,'a-conditional');assert.equal(domina.after,'A');
});
test('v2.1: model recommendation sort differs from raw meta; other sorts and filters preserved',async()=>{
 const manifest=JSON.parse(await readFile('public/data/snapshots/index.json','utf8'));
 const file=manifest.snapshots.find(s=>s.schemaVersion===2&&s.filters.region==='asia').file;
 const frame=expandSnapshotFile(JSON.parse(await readFile(`public/data/snapshots/${file}`,'utf8')),{includeDerived:true}).find(s=>s.filters.division==='diamond_plus');
 const model=createHeroModel();model.state.heroes=normalizeHeroes(JSON.parse(await readFile('tests/fixtures/overfast-heroes.json','utf8')));model.state.statistics=frame;
 const list=model.visibleHeroes();assert(list.findIndex(h=>h.key==='shion')<list.findIndex(h=>h.key==='junkrat'));
 for(let i=1;i<list.length;i++)assert(recommendationOrder(list[i-1])<=recommendationOrder(list[i]));
 model.state.sort='meta-desc';const raw=model.visibleHeroes();assert(raw.findIndex(h=>h.key==='junkrat')<raw.findIndex(h=>h.key==='shion'));
 for(const [sort,field] of [['winrate-desc','winRate'],['pickrate-desc','pickRate'],['banrate-desc','banRate']]){model.state.sort=sort;const vals=model.visibleHeroes().map(h=>h.statistics?.[field]).filter(v=>v!=null);assert.deepEqual(vals,[...vals].sort((a,b)=>b-a));}
 model.state.sort='name-asc';const names=model.visibleHeroes().map(h=>h.name);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'ko')));
 model.state.role='damage';model.state.favoritesOnly=true;model.state.favorites.add('junkrat');assert.deepEqual(model.visibleHeroes().map(h=>h.key),['junkrat']);
});
test('v2.1: shared tier label and mobile card preserve accessible actions',()=>{
 const dom=new JSDOM('<body/>');const old=globalThis.document;globalThis.document=dom.window.document;
 try{const h=applyRecommendationPolicy(hero('A',4));const button=tierButton(h),card=createHeroCard(h,new Set());
 assert.equal(button.querySelector('.recommendation-label').textContent,'조건부');assert.match(button.title,/전문화/);assert.equal(card.querySelector('.recommendation-label').textContent,'조건부');assert.equal(card.querySelector('[data-tier]').dataset.tier,h.key);assert(card.querySelector('[data-favorite]'));
 }finally{globalThis.document=old;dom.window.close();}
});
test('v2.1: detail explains classification, resets on hero change and keeps score/favorite',()=>{
 const dom=new JSDOM('<main id="hero-detail-page"></main>');const old=globalThis.document;globalThis.document=dom.window.document;
 try{
  let h=applyRecommendationPolicy(hero('A',4));const model={state:{favorites:new Set(),statsFilters:{division:'diamond_plus'}},heroByKey:()=>h};
  const detail=normalizeHeroDetail({name:'예시',role:'damage'},'example'),view=createHeroDetailView();
  const render=()=>view.render({status:'ready',result:{detail:{...detail,key:h.key},fetchedAt:'2026-11-06T00:00:00Z'}},model,{key:h.key,tab:'overview'});
  render();assert.match(document.querySelector('.recommendation-description').textContent,/조건부 A/);assert.match(document.querySelector('.detail-summary-info').textContent,/80.0/);assert(document.querySelector('[data-favorite]'));
  h={...applyRecommendationPolicy(hero('A',2.99)),key:'next'};render();assert.match(document.querySelector('.recommendation-description').textContent,/저채용 A/);assert.equal(document.querySelectorAll('.recommendation-description').length,1);
  h={...applyRecommendationPolicy(hero('A',5)),key:'last'};render();assert.equal(document.querySelector('.recommendation-description'),null);
 }finally{globalThis.document=old;dom.window.close();}
});
