import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {SYNERGIES,SYNERGY_REVIEW} from '../src/data/synergies.js';
import {normalizeSynergies} from '../src/models/synergyModel.js';
import {createSynergyService} from '../src/services/synergyService.js';
import {renderSynergies} from '../src/views/synergyView.js';
import roles from '../src/data/subroles.json' with {type:'json'};
test('synergy: all 54 reviewed, max three, no self/tank-tank or numerical fabricated performance',()=>{
 assert.deepEqual(SYNERGY_REVIEW.map(r=>r.heroKey).sort(),Object.keys(roles.heroes).sort());normalizeSynergies(SYNERGIES);
 const evidence=JSON.parse(fs.readFileSync(new URL('../docs/research/synergies/official-review.json',import.meta.url)));
 assert.equal(evidence.heroes.length,54);assert(evidence.heroes.every(r=>r.status===200));
 for(const key of Object.keys(roles.heroes))assert(SYNERGIES.filter(r=>r.heroKey===key).length<=3);
 assert.deepEqual(SYNERGIES.filter(r=>r.heroKey==='genji').map(r=>r.allyHeroKey),['ana','winston','zarya']);
 const row=SYNERGIES[0];for(const bad of [{...row,allyHeroKey:row.heroKey},{...row,heroKey:'winston',allyHeroKey:'zarya'},{...row,sourceUrls:['javascript:bad']},{...row,allyHeroKey:'missing'}])assert.throws(()=>normalizeSynergies([bad]));
 assert.throws(()=>normalizeSynergies([row,row]));assert(SYNERGIES.every(r=>!('winRate'in r)&&!('score'in r)));
});
test('synergy view: portrait links, accessible disclosure, empty/error and safe text',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{
 const heroes=Object.keys(roles.heroes).map(key=>({key,name:key,portrait:''}));const service=createSynergyService();
 const data=service.getHeroSynergies('genji',heroes),panel=renderSynergies(data);assert.equal(panel.querySelectorAll('.counter-hero').length,3);assert.equal(panel.querySelector('a').hash,'#/heroes/ana');assert.equal(panel.querySelectorAll('details').length,3);assert([...panel.querySelectorAll('details')].every(x=>!x.open));
 assert(renderSynergies(service.getHeroSynergies('missing',heroes)).textContent.includes('검토된 시너지 정보가 없습니다.'));
 assert.equal(createSynergyService([{}]).getHeroSynergies('genji',heroes).status,'error');
 data.allies[0].reason='<script>bad</script>';assert.equal(renderSynergies(data).querySelector('script'),null);
 }finally{globalThis.document=prior;dom.window.close();}
});
