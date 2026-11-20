import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {perkCardsForDetail,perkStageComparison} from '../src/models/perkSelectionModel.js';
import {normalizePerkArchive} from '../src/models/perkArchiveModel.js';
const archive=normalizePerkArchive(JSON.parse(fs.readFileSync('public/data/perks/overlooker-perks.json','utf8'))),identities=JSON.parse(fs.readFileSync('tests/fixtures/overfast-perk-identities.json','utf8'));
test('actual 54 heroes / 216 perks retain provider percentages and picks in 108 same-stage comparisons',()=>{
 let total=0;for(const identity of identities){const state={status:'ready',result:archive.frames.get(identity.key)},before=JSON.stringify(state),cards=perkCardsForDetail(identity.key,identity,state);for(const tier of ['minor','major']){const pair=perkStageComparison(identity.key,tier,cards[tier],state);assert.equal(pair.status,'ready');assert.equal(pair.entries.length,2);pair.entries.forEach((e,i)=>{assert.equal(e,cards[tier][i].selection);assert.equal(e.selectionRate,state.result.entries.find(p=>p.perkKey===e.perkKey).selectionRate);assert.equal(e.selectionCount,state.result.entries.find(p=>p.perkKey===e.perkKey).selectionCount);total++;});}assert.equal(JSON.stringify(state),before);}assert.equal(total,216);
});
test('pair guards hero/stage/cohort/identity/missing data and never normalizes non-100 totals or counts',()=>{
 function fixture(){const identity=identities.find(h=>h.key==='genji'),state={status:'ready',result:structuredClone(archive.frames.get('genji'))},cards=perkCardsForDetail('genji',identity,state);return {state,items:cards.minor};}
 for(const change of [(s,i)=>{i[0].selection.selectionRate=null;},(s,i)=>{i[0].selection.filters={...s.result.filters,since:'other'};},(s,i)=>{i[1].selection=i[0].selection;},(s,i)=>{i[0].selection.heroKey='ana';},(s,i)=>{i[0].selection.tier='major';},s=>{s.status='loading';}]){const f=fixture();change(f.state,f.items);assert.equal(perkStageComparison('genji','minor',f.items,f.state).status,'unavailable');}
 for(const [rates,status,remaining]of [[[20,30],'ready',50],[[60,60],'incompatible',0],[[0,0],'ready',100],[[0,100],'ready',0]]){const {state,items}=fixture();items.forEach((p,i)=>{p.selection.selectionRate=rates[i];p.selection.selectionCount=i?99:1;});const pair=perkStageComparison('genji','minor',items,state);assert.equal(pair.status,status);assert.equal(pair.remaining,remaining);assert.deepEqual(pair.entries.map(e=>e.selectionRate),rates);assert.deepEqual(pair.entries.map(e=>e.selectionCount),[1,99]);}
});
