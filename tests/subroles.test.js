import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import data from '../src/data/subroles.json' with { type: 'json' };
import { COUNTER_HERO_KEYS } from '../src/data/counters/roster.js';
import { getHeroSubrole, validateSubroles } from '../src/models/subroleModel.js';
import { normalizeHeroDetail } from '../src/models/heroDetailModel.js';
import { createHeroDetailView } from '../src/views/heroDetailView.js';
import { createHeroModel } from '../src/models/heroModel.js';

test('subroles: full 54 hero roster, valid parents, required changed/new heroes and current +50',()=>{
  assert.deepEqual(Object.keys(data.heroes).sort(),[...COUNTER_HERO_KEYS].sort());
  assert.equal(Object.keys(data.effects).length,10);
  validateSubroles();
  for(const [heroKey,row] of Object.entries(data.heroes)) {
    assert.equal(getHeroSubrole(heroKey,row.parentRole).subroleKey,row.subroleKey);
    assert.equal(getHeroSubrole(heroKey,row.parentRole==='tank'?'damage':'tank'),null);
  }
  for(const [key,role,subrole] of [['genji','damage','flanker'],['shion','damage','flanker'],['sombra','support','tactician'],['dmon','tank','stalwart'],['doctrine','support','survivor']])assert.equal(getHeroSubrole(key,role).subroleKey,subrole);
  assert.equal(data.effects.flanker.effectValue.bonusHealing,50);
  assert(data.effects.flanker.descriptionKo.includes('50'));assert(!/75|2배/.test(data.effects.flanker.descriptionKo));
  const evidence=JSON.parse(fs.readFileSync(new URL('../docs/research/subroles/official-review.json',import.meta.url)));
  for(const hero of evidence.heroes)assert.equal(data.effects[data.heroes[hero.heroKey].subroleKey].subroleNameKo,hero.subroleNameKo);
});

test('subroles: invalid parent, missing evidence, missing hero and API mismatch fail safely',()=>{
  assert.equal(getHeroSubrole('unknown','damage'),null);
  assert.equal(getHeroSubrole('genji','damage','specialist'),null);
  assert.equal(getHeroSubrole('genji','damage','unknown'),null);
  const invalid=structuredClone(data);invalid.heroes.genji.parentRole='support';assert.throws(()=>validateSubroles(invalid));
  const unsafe=structuredClone(data);unsafe.effects.flanker.sourceUrl='javascript:bad';assert.throws(()=>validateSubroles(unsafe));
});

test('subroles DOM: role badges and separate passive; hero transitions clear old content',()=>{
  const dom=new JSDOM('<section id="hero-detail-page"></section>'),previous=globalThis.document;globalThis.document=dom.window.document;
  try{
    const view=createHeroDetailView(),model=createHeroModel();
    const render=(key,role,subrole)=>view.render({status:'ready',result:{detail:normalizeHeroDetail({name:key,role,subrole,abilities:[],perks:{}},key),fetchedAt:'2026-11-03T00:00:00Z'}},model,{key,tab:'overview'});
    render('genji','damage','flanker');
    assert.equal(document.querySelector('.detail-role-badges .role-tag').textContent,'공격');
    assert.equal(document.querySelector('.subrole-tag').textContent,'측면 공격가');
    assert(document.querySelector('#detail-passives').textContent.includes('50'));
    assert.equal(document.querySelectorAll('#detail-passives .ability-card').length,1);
    render('sombra','support','tactician');
    assert.equal(document.querySelector('.subrole-tag').textContent,'전술가');
    assert(!document.querySelector('#detail-passives').textContent.includes('50'));
    assert.equal(document.querySelector('.detail-role-badges .role-tag').textContent,'지원');
    render('unknown','damage',null);assert.equal(document.querySelector('.subrole-tag'),null);
    assert(document.querySelector('#detail-passives').textContent.includes('확인된 하위 역할 정보가 없습니다.'));
    assert(document.querySelector('#detail-minor'));assert(document.querySelector('#detail-major'));
  }finally{globalThis.document=previous;dom.window.close();}
});
