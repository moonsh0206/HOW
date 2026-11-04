import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_FILTERS,divisionMembers,isCompositeDivision,statisticsQuery,normalizeStatistics} from '../src/models/statisticsModel.js';
import {combineDivisionStatistics} from '../src/models/compositeStatisticsModel.js';
import {combineDivisionHistory} from '../src/models/compositeHistoryModel.js';
import {expandSnapshotFile,SNAPSHOT_FIELDS} from '../src/models/snapshotV2Model.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {parseSnapshotFilters} from '../scripts/snapshot-options.js';
import {attachMetaTiers,META_POLICY} from '../src/domain/meta.js';
import {JSDOM} from 'jsdom';
import {createHeroView} from '../src/views/heroView.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {archiveRetentionPlan,preservationTags} from '../src/models/snapshotArchiveModel.js';
import {collectDivisionBatch} from '../scripts/lib/divisionBatch.js';
const f={...DEFAULT_FILTERS};
const row=(winRate=50,pickRate=10,banRate=0)=>({hero:'genji',winRate,pickRate,banRate});
const component=(division,record=row())=>({filters:{...f,division},records:[record]});
test('composite groups: default plus, ordered unique individual ranks, GM/champion once, all distinct',()=>{
 assert.equal(f.division,'diamond_plus');assert.deepEqual(divisionMembers(f.division),['diamond','master','grandmaster']);assert.deepEqual(divisionMembers('master_plus'),['master','grandmaster']);
 for(const rank of ['bronze','silver','gold','platinum','emerald','diamond','master']){const members=divisionMembers(rank+'_plus');assert.equal(members.length,new Set(members).size);assert.equal(members.at(-1),'grandmaster');}
 assert.deepEqual(divisionMembers('all'),['all']);assert(!isCompositeDivision('grandmaster_plus'));assert.throws(()=>divisionMembers('champion'));assert.throws(()=>parseSnapshotFilters(['--division','diamond_plus']));assert.equal(META_POLICY.weights.winRate,.65);
});
test('composite arithmetic: exact mean then existing score; null/error never shrink denominator, zero valid, no cohort mixing',()=>{
 const parts=[component('diamond',row(51,0,0)),component('master',row(54,3,6)),component('grandmaster',row(57,6,9))];
 const [actual]=combineDivisionStatistics(f,parts);assert.equal(actual.winRate,54);assert.equal(actual.pickRate,3);assert.equal(actual.banRate,5);
 for(const partsMissing of [parts.slice(0,2),parts.map((p,i)=>i===1?component('master',row(null,3,6)):p)]){const [r]=combineDivisionStatistics(f,partsMissing);assert.equal(r.winRate,null);assert(r.missingDivisions.length);assert.equal(attachMetaTiers([{key:'genji',role:'damage'}],[r])[0].tier,null);}
 assert.throws(()=>combineDivisionStatistics(f,parts.map((p,i)=>i? p:{...p,filters:{...p.filters,map:'busan'}})));
});
test('composite service: only individual API queries, concurrency <=3, pending and raw cache reuse, missing rank errors',async()=>{
 let active=0,max=0;const calls=[];
 const service=createStatisticsService({fetcher:async url=>{calls.push(url);active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,3));active--;const q=new URL(url).searchParams;assert(!q.has('how_division_group'));assert(!q.get('competitive_division').includes('plus'));return {ok:true,headers:new Headers(),json:async()=>[{hero:'genji',winrate:50,pickrate:0,banrate:0}]};}});
 const [a,b]=await Promise.all([service.getStatistics(f),service.getStatistics(f)]);assert.equal(a,b);assert.equal(calls.length,3);assert.equal(a.records[0].pickRate,0);await service.getStatistics({...f,division:'master_plus'});assert.equal(calls.length,3);
 await service.getStatistics({...f,division:'bronze_plus'});assert(max<=3);assert.equal(calls.length,8);
 await service.getStatistics({...f,region:'europe',map:'busan'});assert.equal(calls.length,11);assert(calls.slice(-3).every(url=>new URL(url).searchParams.get('region')==='europe'&&new URL(url).searchParams.get('map')==='busan'));
 const failing=createStatisticsService({fetcher:async url=>new URL(url).searchParams.get('competitive_division')==='master'?{ok:false,status:503,headers:new Headers()}:{ok:true,headers:new Headers(),json:async()=>[{hero:'genji',winrate:50,pickrate:10,banrate:0}]}});
 const partial=await failing.getStatistics(f);assert.equal(partial.records[0].winRate,null);assert.deepEqual(partial.records[0].missingDivisions,['master']);assert.match(partial.error,/503/);
});
test('composite history: verified matching patch/window/time only; partial, unknown, region, map or delayed rows excluded',()=>{
 const catalog=[{id:'test',sourceUrl:'https://example.org/patch'}];
 const parts=['diamond','master','grandmaster'].map((division,i)=>({...component(division,row(50+i,10+i,2+i)),collectedAt:`2026-11-02T00:0${i}:00Z`,patch:'test',statisticsWindow:'since-patch-start',patchVerification:{status:'verified',catalogId:'test',sourceUrl:catalog[0].sourceUrl,statisticsWindow:'since-patch-start',verifiedAt:'2026-11-02T00:00:00Z'}}));
 const history=combineDivisionHistory(parts,f,{catalog});assert.equal(history.length,1);assert.equal(history[0].records[0].winRate,51);assert.equal(history[0].filters.division,'diamond_plus');
 for(const bad of [parts.slice(0,2),parts.map(p=>({...p,patch:null})),parts.map((p,i)=>i===1?{...p,filters:{...p.filters,region:'europe'}}:p),parts.map((p,i)=>i===1?{...p,collectedAt:'2026-11-02T00:10:00Z'}:p)])assert.equal(combineDivisionHistory(bad,f,{catalog}).length,0);
});
test('snapshot v2: raw division arrays restore without rounding; missing/error stay absent, no synthetic rank storage',()=>{
 const raw={schemaVersion:2,source:'OverFast API',fields:SNAPSHOT_FIELDS,heroes:['genji'],platform:'pc',gamemode:'competitive',region:'asia',map:'all',divisions:{diamond:{status:'ok',collectedAt:'2026-11-02T00:00:00Z',patch:null,records:[[50.123,0,null]]},master:{status:'error',records:null}}};
 const [actual]=expandSnapshotFile(raw);assert.equal(actual.records[0].winRate,50.123);assert.equal(actual.records[0].pickRate,0);assert.equal(actual.records[0].banRate,null);assert.throws(()=>expandSnapshotFile({...raw,heroes:['genji','genji']}));assert.throws(()=>expandSnapshotFile({...raw,divisions:{diamond_plus:raw.divisions.diamond}}));
});
test('composite UI: all options, default selection, mean disclosure and missing division in cards',async()=>{
 const dom=new JSDOM(await readFile(new URL('../index.html',import.meta.url),'utf8'));const previous=globalThis.document;globalThis.document=dom.window.document;
 try{const model=createHeroModel();model.state.status='ready';model.state.heroes=[{key:'genji',name:'겐지',role:'damage'}];model.state.statistics={filters:f,fetchedAt:'2026-11-02T00:00:00Z',records:[{...row(null,null,null),missingDivisions:['master']}]};const view=createHeroView();view.render(model);assert.equal(document.querySelector('#stats-division').value,'diamond_plus');assert.equal(document.querySelectorAll('#stats-division option').length,16);assert.match(document.querySelector('#stats-status').textContent,/동일 비중/);assert.match(document.querySelector('#hero-cards').textContent,/마스터/);}finally{globalThis.document=previous;dom.window.close();}
});

test('composite absent hero: every required division is shown missing, never classified or filled from another hero',()=>{
 const model=createHeroModel();model.state.heroes=[{key:'ana',name:'아나',role:'support'}];model.state.statistics={filters:f,records:[row()]};const hero=model.heroByKey('ana');assert.deepEqual(hero.statistics.missingDivisions,['diamond','master','grandmaster']);assert.equal(hero.tier,null);assert.equal(hero.statistics.winRate,null);
});

test('v2 batch: nine originals per region, 27 conditions available, isolated errors and exact key restoration',async()=>{
 const queried=[];
 for(const region of ['asia','europe','americas']){
  const batch=await collectDivisionBatch({region,heroKeys:['genji'],now:()=>Date.parse('2026-11-04T00:00:00Z'),service:{async getStatistics(filters){queried.push(filters);if(filters.division==='silver')throw new Error('503');return {filters,records:[row(50.125,0,0)],fetchedAt:'2026-11-04T00:00:00Z',providerAgeSeconds:3};}}});
  assert.equal(Object.keys(batch.divisions).length,9);assert.equal(batch.divisions.silver.status,'error');assert.equal(batch.divisions.silver.records,null);const snapshots=expandSnapshotFile(batch);assert.equal(snapshots.length,8);assert(snapshots.every(s=>s.filters.region===region&&s.records[0].winRate===50.125));assert(!JSON.stringify(batch).includes('_plus'));
 }
 assert.equal(queried.length,27);assert.equal(new Set(queried.map(statisticsQuery)).size,27);
});

test('v2 SnapshotService: shared file read, exact original divisions, v1 preserved, no incomplete composite history',async()=>{
 const time='2026-11-04T00:00:00Z',file='2026-11-04T00-00-00Z.json';
 const raw={schemaVersion:2,source:'OverFast API',fields:SNAPSHOT_FIELDS,heroes:['genji'],platform:'pc',gamemode:'competitive',region:'asia',map:'all',divisions:Object.fromEntries(['diamond','master','grandmaster'].map(division=>[division,{status:'ok',collectedAt:time,patch:null,records:[[50,0,0]]}]))};
 const entries=expandSnapshotFile(raw).map(s=>({file,collectedAt:s.collectedAt,filters:s.filters}));let files=0;
 const service=createSnapshotService({now:()=>Date.parse('2026-11-04T01:00:00Z'),fetcher:async url=>({ok:true,json:async()=>url.endsWith('index.json')?{schemaVersion:1,snapshots:entries}:(files++,raw)})});
 const result=await service.getHistory(f,{scope:'compare'});assert.equal(result.snapshots.length,0);assert.equal(files,1);const original=await service.getHistory({...f,division:'master'},{scope:'compare'});assert.equal(original.snapshots.length,1);assert.equal(original.snapshots[0].records[0].pickRate,0);assert.equal(files,1);
});

test('hybrid retention dry-run: 14-day rolling, legacy, pending, milestones and permanent tags never deleted',()=>{
 const now=Date.parse('2026-11-04T00:00:00Z'),base={schemaVersion:2,reviewStatus:'complete',observationDate:'2026-10-01'};
 const entries=[{...base,file:'old'},{...base,file:'day14',observationDate:'2026-10-21'},{...base,file:'legacy',schemaVersion:1},{...base,file:'pending',reviewStatus:'pending'},...['pre-patch','D+1','D+3','D+7','monthly'].map(tag=>({...base,file:tag,preserveTags:[tag]}))];
 const plan=archiveRetentionPlan(entries,{now});assert.equal(plan.dryRun,true);assert.deepEqual(plan.candidates,['old']);assert.equal(plan.keep.length,8);assert(archiveRetentionPlan(entries,{now,days:7}).candidates.includes('day14'));assert.equal(entries.length,9);
});

test('patch preservation: before, D+1/D+3/D+7 real files; a newer patch cuts off previous follow-up',()=>{
 const catalog=[{id:'old',type:'balance',effectiveAt:'2026-10-01T00:00:00Z',sourceUrl:'https://example.org/old'},{id:'p1',type:'balance',effectiveAt:'2026-11-01T00:00:00Z',sourceUrl:'https://example.org/p1'},{id:'p2',type:'balance',effectiveAt:'2026-11-06T00:00:00Z',sourceUrl:'https://example.org/p2'}];
 const rows=[['pre','old','2026-10-31T00:00:00Z'],['one','p1','2026-11-02T00:00:00Z'],['three','p1','2026-11-04T00:00:00Z'],['new','p2','2026-11-07T00:00:00Z'],['seven','p2','2026-11-13T00:00:00Z']].map(([file,patch,collectedAt])=>({file,snapshot:{filters:{...f,division:'diamond'},patch,collectedAt,patchVerification:{status:'verified',catalogId:patch,sourceUrl:catalog.find(p=>p.id===patch).sourceUrl,statisticsWindow:'since-patch-start',verifiedAt:collectedAt}}}));
 const tags=preservationTags(rows,catalog);assert(tags.pre.includes('p1:pre-patch'));assert(tags.one.includes('p1:D+1'));assert(tags.three.includes('p1:D+3'));assert(!Object.values(tags).flat().includes('p1:D+7'));assert(tags.seven.includes('p2:D+7'));
});


test('unverified same-batch originals create a labeled composite point, never a verified patch', async()=>{
 const at='2026-11-04T00:00:00Z',batchId='asia:2026-11-04T00:00:00Z',raw={
  schemaVersion:2,source:'OverFast API',fields:SNAPSHOT_FIELDS,heroes:['genji'],platform:'pc',gamemode:'competitive',region:'asia',map:'all',batchId,
  divisions:Object.fromEntries(['diamond','master','grandmaster'].map((division,i)=>[division,{status:'ok',collectedAt:new Date(Date.parse(at)+i*60000).toISOString(),patch:null,patchVerification:{status:'unverified'},statisticsWindow:'unverified-patch-window',records:[[50+i,10+i,1+i]]}]))
 };
 const expanded=expandSnapshotFile(raw);const combined=combineDivisionHistory(expanded,f);
 assert.equal(combined.length,1);assert.equal(combined[0].patch,null);assert.equal(combined[0].statisticsWindow,'unverified-patch-window');assert.equal(combined[0].records[0].winRate,51);assert.equal(combined[0].batchId,batchId);
 assert.equal(combineDivisionHistory(expanded.map((p,i)=>i===1?{...p,batchId:'different'}:p),f).length,0);
 assert.equal(combineDivisionHistory(expanded.map((p,i)=>i===2?{...p,collectedAt:'2026-11-05T00:00:00Z'}:p),f).length,0);
 assert.equal(combineDivisionHistory(expanded.slice(1),f).length,0);
 const file='2026-11-04T00-00-00Z.json',entries=expanded.map(s=>({file,collectedAt:s.collectedAt,filters:s.filters}));
 let reads=0;const service=createSnapshotService({now:()=>Date.parse('2026-11-04T01:00:00Z'),fetcher:async url=>({ok:true,json:async()=>url.endsWith('index.json')?{schemaVersion:2,snapshots:entries}:(reads++,raw)})});
 const result=await service.getHistory(f,{scope:'compare'});assert.equal(result.snapshots.length,1);assert.equal(result.snapshots[0].records[0].pickRate,11);assert.equal(reads,1);
});
