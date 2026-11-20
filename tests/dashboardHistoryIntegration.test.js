import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {deriveRoleMeans} from '../scripts/derive-role-means.js';
import {createRoleMeanService} from '../src/services/roleMeanService.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {createHeroModel,normalizeHeroes} from '../src/models/heroModel.js';
import {createMetaDashboardController} from '../src/controllers/metaDashboardController.js';
import {createCounterService} from '../src/services/counterService.js';
import {dashboardHistoryChart} from '../src/views/dashboardHistoryView.js';
import {dashboardPlayerSearch} from '../src/views/dashboardPlayerSearch.js';
import {setLanguage} from '../src/i18n/i18n.js';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
test('compact role archive retains real prior means after source retention; corrupt archive cannot be overwritten',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'how-mean-retain-')),output=path.join(dir,'means.json'),directory=path.join(dir,'snapshots');
 try{await fs.cp('public/data/snapshots',directory,{recursive:true});const first=await deriveRoleMeans({directory,output,apply:true});const index=await read(path.join(directory,'index.json'));index.snapshots=index.snapshots.filter(e=>e.file===index.snapshots.at(-1).file);await fs.writeFile(path.join(directory,'index.json'),JSON.stringify(index));const next=await deriveRoleMeans({directory,output,apply:true});assert.equal(next.observations,first.observations);assert.deepEqual(next.archive.observations,first.archive.observations);await fs.writeFile(output,'{}');await assert.rejects(deriveRoleMeans({directory,output,apply:true}));assert.equal(await fs.readFile(output,'utf8'),'{}');}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('mean history retains both patch windows but explicitly prevents their connection and uses one latest KST observation per day',async()=>{
 const archive=await read('public/data/role-means/observations.json'),heroes=normalizeHeroes(await read('tests/fixtures/overfast-heroes.json'));
 const original=archive.observations.find(r=>r.filters.region==='asia'&&r.filters.division==='diamond_plus');
 archive.observations=['2026-11-18T01:00:00Z','2026-11-19T01:00:00Z','2026-11-19T02:00:00Z'].map((collectedAt,i)=>({...structuredClone(original),collectedAt,observationStart:collectedAt,date:collectedAt.slice(0,10),statisticsWindow:i?'new-window':'old-window'}));
 const service=createRoleMeanService({now:()=>Date.parse('2026-11-20T01:00:00Z'),fetcher:async()=>({ok:true,json:async()=>archive})});
 const history=await service.getHistory(DEFAULT_FILTERS,{days:7,heroes});assert(history.available);for(const series of history.series){assert.equal(series.points.length,2);assert.equal(series.points[1].observedAt,'2026-11-19T02:00:00Z');assert.equal(series.points[1].connectPrevious,false);assert.equal(series.points[0].value,original.roles[series.role].value);}
});
test('graph-only rank guards rapid replies without changing shared filters or requesting current statistics again',async()=>{
 const dom=new JSDOM('<section id="dashboard-page"></section>'),old=globalThis.document;globalThis.document=dom.window.document;let controller;
 try{const model=createHeroModel();Object.assign(model.state,{heroes:normalizeHeroes(await read('tests/fixtures/overfast-heroes.json')),status:'ready',statsStatus:'ready'});let mapCalls=0;const calls=[];
 controller=createMetaDashboardController({model,counterService:createCounterService(),statisticsService:{async getStatistics(filters){mapCalls++;return {filters,records:[]};}},roleMeanService:{getHistory(filters){return new Promise(resolve=>calls.push({filters,resolve}));}}});controller.setActive(true);await flush();assert.equal(calls[0].filters.division,'diamond_plus');
 const select=document.querySelector('#dashboard-history-division');for(const rank of ['master','bronze']){select.value=rank;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();}assert.equal(model.state.statsFilters.division,'diamond_plus');assert.equal(mapCalls,1);
 calls[2].resolve({available:false,series:[],days:7,marker:'latest'});await flush();calls[1].resolve({available:false,series:[],days:7,marker:'old'});calls[0].resolve({available:false,series:[],days:7,marker:'older'});await flush();assert.equal(select.value,'bronze');assert(document.querySelector('#dashboard-history .dashboard-caption').textContent.includes('브론즈'));
 }finally{controller?.stop();dom.window.close();globalThis.document=old;}
});
test('chart shows one actual day as dots only, breaks incompatible windows, exposes keyboard collection timestamps',()=>{
 const dom=new JSDOM('<main></main>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{const point={day:'2026-11-19',time:Date.parse('2026-11-19T01:00:00Z'),observedAt:'2026-11-19T01:00:00Z',value:52.1234,count:15,targetCount:15};const single=dashboardHistoryChart({available:false,series:[{role:'tank',points:[point]}]});assert.equal(single.querySelectorAll('circle[tabindex="0"]').length,1);assert(single.querySelector('circle').getAttribute('aria-label').includes('52.12%'));assert(!single.querySelector('path').getAttribute('d').includes('L'));
 const multi=dashboardHistoryChart({available:true,series:[{role:'tank',points:[{...point,day:'2026-11-18'}, {...point,connectPrevious:false}]}]});assert.equal((multi.querySelector('path').getAttribute('d').match(/M/g)??[]).length,2);
 }finally{dom.window.close();globalThis.document=old;}
});
test('dashboard search reuses validation, preserves draft on translations, sends raw BattleTag once and ignores whitespace',()=>{
 const dom=new JSDOM('<main></main>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{const search=dashboardPlayerSearch();document.querySelector('main').append(search.form);const input=search.form.querySelector('input'),sent=[];document.addEventListener('how:playersearch',e=>sent.push(e.detail.query));input.value='  \t ';search.form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.deepEqual(sent,[]);input.value='TeKrop#2217';for(const lang of ['en','ja','ko']){setLanguage(lang);search.translate();assert.equal(input.value,'TeKrop#2217');}search.form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.deepEqual(sent,['TeKrop#2217']);input.value='<script>';input.reportValidity=()=>true;search.form.dispatchEvent(new dom.window.Event('submit',{cancelable:true}));assert.equal(sent.length,1);
 }finally{setLanguage('ko');dom.window.close();globalThis.document=old;}
});
