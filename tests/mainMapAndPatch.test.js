import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import names from '../src/data/mapNamesKo.json' with {type:'json'};
import {MAP_KEYS,MAP_NAMES} from '../src/models/mapModel.js';
import {renderPatchNote} from '../src/views/patchNoteView.js';
import {CURRENT_PATCH_NOTE} from '../src/data/currentPatchNote.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {DEFAULT_FILTERS as UI_DEFAULT_FILTERS,ALL_RANK_FILTERS} from '../src/models/statisticsModel.js';
const DEFAULT_FILTERS={...UI_DEFAULT_FILTERS,division:'diamond'}; // Explicit original-cohort regression fixture.

test('official localization: entire API catalogue tracked; all selectable maps match official Korean labels',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../docs/research/map-localization/maps-response.json',import.meta.url)));
 const official=JSON.parse(fs.readFileSync(new URL('../docs/research/map-localization/official-options.json',import.meta.url)));
 assert.deepEqual(Object.keys(names).sort(),raw.map(row=>row.key).sort());
 for(const key of MAP_KEYS){assert.equal(names[key].status,'verified');assert.equal(MAP_NAMES[key],official.find(option=>option.key===key).name);assert(/[가-힣]/.test(MAP_NAMES[key]));}
 assert.equal(names['arena-victoriae'].nameKo,null);assert.equal(names['arena-victoriae'].status,'needs-review');
 assert.equal(MAP_NAMES['lijiang-tower'],'리장 타워');assert.equal(MAP_NAMES['aatlis'],'아틀리스');
});

test('snapshot preservation: original file bytes/index retained; diamond/all/maps remain separate',async()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../docs/research/snapshot-preservation/before.json',import.meta.url)));
 const root=new URL('../public/data/snapshots/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('index.json',root)));
 for(const prior of audit.originals){assert(manifest.snapshots.some(entry=>JSON.stringify(entry)===JSON.stringify(prior.entry)));assert.equal(createHash('sha256').update(fs.readFileSync(new URL(prior.entry.file,root))).digest('hex'),prior.sha256);}
 const now=Math.max(...manifest.snapshots.map(e=>Date.parse(e.collectedAt)))+1000;
 const service=createSnapshotService({now:()=>now,fetcher:async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL(url.split('/').at(-1),root)))})});
 const all=await service.getHistory(ALL_RANK_FILTERS,{scope:'compare'}),diamond=await service.getHistory(DEFAULT_FILTERS,{scope:'compare'}),busan=await service.getHistory({...DEFAULT_FILTERS,map:'busan'},{scope:'compare'});
 assert(all.snapshots.length>=1);assert(diamond.snapshots.length>=1);assert.equal(busan.snapshots.length,0);
 assert(all.snapshots.every(s=>s.filters.division==='all'));assert(diamond.snapshots.every(s=>s.filters.division==='diamond'));
 assert(diamond.snapshots.every(s=>s.records.length===54&&s.patch===null&&s.aggregateAt===null&&s.endpoint.includes('competitive_division=diamond')));
});

test('patch note card: compact own summary, Korean date, verified direct official link and safe disclosure',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{const card=renderPatchNote();assert.equal(card.querySelector('h2').textContent,'이번 패치 노트');assert(card.textContent.includes('2026.11.04'));assert.equal(card.querySelector('details').open,false);
 const link=card.querySelector('a');assert.equal(link.href,CURRENT_PATCH_NOTE.sourceUrl);assert.equal(link.target,'_blank');assert(link.rel.includes('noopener'));assert(link.rel.includes('noreferrer'));assert.equal(new URL(link.href).hash,'#patch-2026-11-03');assert.equal(CURRENT_PATCH_NOTE.statisticsWindowStatus,'unverified');
 }finally{globalThis.document=prior;dom.window.close();}
});
