import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename,resolve} from 'node:path';
import {persistDivisionBatch} from '../scripts/lib/batchPersistence.js';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {collectDivisionBatch} from '../scripts/lib/divisionBatch.js';
import {expandSnapshotFile,buildV2Derived,DERIVED_DIVISIONS} from '../src/models/snapshotV2Model.js';
import {DEFAULT_FILTERS,DIVISIONS,normalizeStatistics,statisticsQuery} from '../src/models/statisticsModel.js';
import {DERIVATION_VERSION,derivedProvenance,originalProvenance} from '../src/models/statisticsProvenance.js';
import {combineDivisionHistory} from '../src/models/compositeHistoryModel.js';
import {combineDivisionStatistics} from '../src/models/compositeStatisticsModel.js';
import {hotHeroes} from '../src/domain/insights.js';
import {attachMetaTiers} from '../src/domain/meta.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {renderPickHistory} from '../src/views/pickHistoryView.js';
import {createFilterStorage} from '../src/storage/filterStorage.js';
import {parseDivisionBatchOptions} from '../scripts/division-batch-options.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {createHeroView} from '../src/views/heroView.js';
import {createHeroController} from '../src/controllers/heroController.js';
import {createHeroDetailView} from '../src/views/heroDetailView.js';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
import {createRoutingController} from '../src/controllers/routingController.js';
import {createInsightView} from '../src/views/insightView.js';
const f={...DEFAULT_FILTERS},heroes=[{key:'genji',name:'겐지',role:'damage'},{key:'ana',name:'아나',role:'support'}];
const clone=x=>JSON.parse(JSON.stringify(x));
async function fixture(day=1,region='asia',fail=null){
 const time=Date.parse(`2026-11-0${day}T00:00:00Z`),calls=[];
 const batch=await collectDivisionBatch({region,heroKeys:heroes.map(h=>h.key),now:()=>time,service:{async getStatistics(filters){
  calls.push(filters);if(filters.division===fail)throw new Error('fixture 503');
  const rank=Object.keys(DIVISIONS).indexOf(filters.division),bonus=filters.division==='all'?20:rank/10;
  return {filters,records:normalizeStatistics([{hero:'genji',winrate:51+day+bonus,pickrate:8+day*2+bonus,banrate:day},{hero:'ana',winrate:50,pickrate:8,banrate:0}]),fetchedAt:new Date(time+rank*1000).toISOString(),providerAgeSeconds:30};
 }}});return {batch,calls};
}
const stamp=day=>`2026-11-0${day}T00-00-00Z.json`;
function archive(batches){
 const files=Object.fromEntries(batches.map((b,i)=>[stamp(i+1),b]));
 const manifest={schemaVersion:1,snapshots:Object.entries(files).flatMap(([file,b])=>expandSnapshotFile(b).map(s=>({file,collectedAt:s.collectedAt,filters:s.filters})))};
 const reads=[];
 const service=createSnapshotService({base:'/HOW/',now:()=>Date.parse('2026-11-03T00:00:00Z'),fetcher:async url=>{reads.push(url);const name=url.split('/').at(-1);assert(name==='index.json'||files[name]);return {ok:true,json:async()=>name==='index.json'?clone(manifest):clone(files[name])};}});
 return {service,reads,manifest};
}

test('grouped storage: nine distinct API originals, seven derived caches, all is not bronze_plus, complete/partial explicit',async()=>{
 assert.equal(DEFAULT_FILTERS.division,'diamond_plus');
 for(const region of ['asia','europe','americas']){
  const {batch,calls}=await fixture(1,region);assert.equal(calls.length,9);assert.equal(new Set(calls.map(statisticsQuery)).size,9);assert.equal(batch.collection.status,'complete');assert.deepEqual(Object.keys(batch.divisions),Object.keys(DIVISIONS));assert.deepEqual(Object.keys(batch.derived),DERIVED_DIVISIONS);
  const all=expandSnapshotFile(batch).find(s=>s.filters.division==='all'),plus=expandSnapshotFile(batch,{includeDerived:true}).find(s=>s.filters.division==='bronze_plus');assert.notEqual(all.records[0].winRate,plus.records[0].winRate);assert.equal(plus.provenance.version,DERIVATION_VERSION);assert.equal(plus.patch,null);assert.equal(batch.derived.diamond_plus.status,'ok');
 }
 const {batch}=await fixture(1,'asia','master');assert.equal(batch.collection.status,'partial');assert.deepEqual(batch.collection.failedDivisions,['master']);assert.match(batch.divisions.master.error,/503/);assert.equal(batch.derived.diamond_plus.status,'unavailable');assert.equal(batch.divisions.diamond.status,'ok');
});

test('derived integrity and compatibility: original or cache tampering rejected, cache absent recomputed, actual 0/null/review retained',async()=>{
 const {batch}=await fixture();
 for(const mutate of [b=>b.divisions.diamond.records[0][0]++,b=>b.derived.diamond_plus.records[0][1]++,b=>b.derived.diamond_plus.calculationVersion='other']){const broken=clone(batch);mutate(broken);assert.throws(()=>expandSnapshotFile(broken),/integrity/);}
 const old=clone(batch);delete old.derived;const frames=expandSnapshotFile(old,{includeDerived:true});assert.equal(frames.length,16);assert.equal(frames.find(s=>s.filters.division==='diamond_plus').records[0].winRate,batch.derived.diamond_plus.records[0][0]);
 const partial=clone(batch);delete partial.derived;partial.divisions.master.records[0][1]=null;delete partial.divisions.master.dataQuality;delete partial.divisions.master.qualitySummary;
 const row=expandSnapshotFile(partial,{includeDerived:true}).find(s=>s.filters.division==='diamond_plus').records[0];assert(row.winRate>0);assert.equal(row.pickRate,null);assert(row.banRate>0);assert.equal(attachMetaTiers(heroes,[row])[0].tier,null);
 const review=clone(batch);delete review.derived;review.divisions.grandmaster.records[0][0]=0;delete review.divisions.grandmaster.dataQuality;delete review.divisions.grandmaster.qualitySummary;
 const r=expandSnapshotFile(review,{includeDerived:true}).find(s=>s.filters.division==='diamond_plus').records[0];assert.equal(r.winRate,null);assert(r.pickRate>0);assert.deepEqual(r.reviewDivisions,['grandmaster']);
 const verified=clone(batch);delete verified.derived;verified.divisions.diamond.records[0][0]=0;verified.divisions.diamond.dataQuality[0]={source:'blizzard',fields:{winRate:'verified'},rawValues:{}};delete verified.divisions.diamond.qualitySummary;
 assert.equal(expandSnapshotFile(verified).find(s=>s.filters.division==='diamond').records[0].quality.fields.winRate,'verified');
});

test('history: same-batch unknown patches visible on two dates; mixed batches, missing ranks, timing and cohorts never synthesized',async()=>{
 const a=(await fixture(1)).batch,b=(await fixture(2)).batch,raw=[...expandSnapshotFile(a),...expandSnapshotFile(b)];
 const points=combineDivisionHistory(raw,f);assert.equal(points.length,2);assert(points.every(s=>s.patch===null&&s.patchVerification.status==='unverified'));assert(points[0].records[0].pickRate<points[1].records[0].pickRate);
 assert.equal(combineDivisionHistory(raw.map(s=>s.filters.division==='master'?{...s,batchId:'different'}:s),f).length,0);
 assert.equal(combineDivisionHistory(raw.filter(s=>s.filters.division!=='grandmaster'),f).length,0);
 assert.equal(combineDivisionHistory(raw.map(s=>({...s,filters:{...s.filters,region:'europe'}})),f).length,0);
 assert.equal(combineDivisionHistory(raw.map(s=>s.filters.division==='master'?{...s,collectedAt:'2026-11-01T01:00:00Z'}:s),f).length,0);
 assert.equal(combineDivisionHistory(raw.map(s=>({...s,derivationVersion:'old'})),f).length,0);
 const {service,reads}=archive([a,b]);for(const division of [...Object.keys(DIVISIONS),...DERIVED_DIVISIONS]){const h=await service.getHistory({...f,division},{scope:'compare'});assert.equal(h.snapshots.length,2);}
 assert.equal(reads.filter(p=>!p.endsWith('index.json')).length,2);assert.equal((await service.getHistory({...f,map:'busan'},{scope:'compare'})).snapshots.length,0);
});

test('HOT in all 16 divisions: structured origins, same policy, real 1h–7d observations and no forced fill',async()=>{
 const old=expandSnapshotFile((await fixture(1)).batch,{includeDerived:true}),fresh=expandSnapshotFile((await fixture(2)).batch,{includeDerived:true});
 for(const division of [...Object.keys(DIVISIONS),...DERIVED_DIVISIONS]){
  const previous=old.find(s=>s.filters.division===division),s=fresh.find(s=>s.filters.division===division),current={...s,fetchedAt:s.collectedAt,source:s.composite?'any display label':'OverFast API'},joined=attachMetaTiers(heroes,s.records);
  const hot=hotHeroes(joined,current,previous);assert.equal(hot.available,true,division);assert.equal(hot.heroes[0].key,'genji');assert.match(hot.warning,/미확인/);
  assert.equal(hotHeroes(joined,{...current,fetchedAt:previous.collectedAt},previous).available,false);assert.equal(hotHeroes(joined,{...current,fetchedAt:'2026-11-10T00:00:00Z'},previous).available,false);
  assert.equal(hotHeroes(joined,current,{...previous,filters:{...previous.filters,map:'busan'}}).available,false);
  const flat=joined.map(h=>({...h,statistics:{...h.statistics,pickRate:0}}));assert.equal(hotHeroes(flat,current,previous).heroes.length,0);
  const bad=joined.map(h=>({...h,statistics:{...h.statistics,winRate:0}}));assert.equal(hotHeroes(bad,current,previous).heroes.length,0);
  if(s.composite){assert.equal(hotHeroes(joined,current,{...previous,provenance:{...previous.provenance,version:'old'}}).available,false);assert.equal(hotHeroes(joined,{...current,provenance:undefined},previous).available,false);}
  assert.equal(hotHeroes(joined,current,{...previous,source:'untrusted',provenance:undefined}).available,false);
 }
});

test('HOT patch safety: known patch boundary or verified/unknown windows withheld; metadata string is not enough',async()=>{
 const old=expandSnapshotFile((await fixture(1)).batch)[5],fresh=expandSnapshotFile((await fixture(2)).batch)[5],current={...fresh,fetchedAt:fresh.collectedAt},joined=attachMetaTiers(heroes,fresh.records);
 assert.equal(hotHeroes(joined,{...current,patch:'new-patch'},old).available,false);
 assert.equal(hotHeroes(joined,{...current,statisticsWindow:'since-patch-start'},old).available,false);
 assert.equal(hotHeroes(joined,{...current,source:'HOW label',provenance:undefined},old).available,false);
});

test('history DOM: all three series show two exact actual times and values from unknown-patch derived observations',async()=>{
 const {service}=archive([(await fixture(1)).batch,(await fixture(2)).batch]),history=await service.getHistory(f,{scope:'compare'});
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{for(const metric of ['winRate','pickRate','banRate']){const result=buildObservationTimeline(history.snapshots,'genji',f,{metric,now:Date.parse(history.observedUntil)}),panel=renderPickHistory({status:'ready',metric,result});assert.equal(panel.querySelectorAll('.history-point').length,2);assert.equal(panel.querySelectorAll('.history-comparison').length,1);assert.equal(result.points[0].value,history.snapshots[0].records[0][metric]);assert.match(panel.textContent,/패치 미확인/);assert.equal(result.points[0].collectedAt,history.snapshots[0].collectedAt);}}
 finally{globalThis.document=prior;dom.window.close();}
});

test('filter persistence and recovery options: invalid storage/paths safe, defaults and old source files protected',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},prefs=createFilterStorage(()=>storage);
 assert.equal(prefs.load(),null);prefs.save({...f,division:'master_plus',region:'europe',map:'busan'});const reload=createFilterStorage(()=>storage);assert.equal(reload.load().division,'master_plus');assert.equal(reload.load().map,'busan');assert.equal(createFilterStorage(()=>{throw new Error();}).load(),null);
 assert.deepEqual(parseDivisionBatchOptions([]),{region:'asia',apply:false,retryOf:null});assert.equal(parseDivisionBatchOptions(['--region','europe','--retry-of',stamp(1)]).apply,false);assert.throws(()=>parseDivisionBatchOptions(['--retry-of','../index.json']));
 const manifest=JSON.parse(await readFile(new URL('../public/data/snapshots/index.json',import.meta.url),'utf8'));
 const expected={'2026-11-02T05-36-24.500Z.json':'0e9853d0c11d022a437bb5f3f355714da9fe45b349ae7210ea0985c87b0bd816','2026-11-04T00-52-25.812Z.json':'e6dce1cd90d8f902ce0397c4f9f7b9797e96b72452427a6f7eac548ee89cba2c'};for(const file of Object.keys(expected)){const bytes=await readFile(new URL('../public/data/snapshots/'+file,import.meta.url));assert.equal(JSON.parse(bytes).schemaVersion,1);assert(manifest.snapshots.some(e=>e.file===file));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected[file]);}
});

test('batch transaction fixtures: existing file or pending collision never deleted, append preserves index, rollback owns only new files',async t=>{
 const root=await mkdtemp(join(tmpdir(),'how-grouped-fixture-'));t.after(async()=>{if(dirname(resolve(root))!==resolve(tmpdir())||!basename(root).startsWith('how-grouped-fixture-'))throw new Error('Unsafe fixture cleanup');await rm(root,{recursive:true,force:true});});
 const raw=(await fixture()).batch,index={schemaVersion:1,snapshots:[]},before=JSON.stringify(index),name=stamp(1);await writeFile(join(root,'index.json'),before);await writeFile(join(root,name),'existing original bytes');
 await assert.rejects(persistDivisionBatch(root,raw,index,name),/EEXIST/);assert.equal(await readFile(join(root,name),'utf8'),'existing original bytes');assert.equal(await readFile(join(root,'index.json'),'utf8'),before);
 const pending=`index.${process.pid}.pending`;await writeFile(join(root,pending),'foreign pending');await assert.rejects(persistDivisionBatch(root,raw,index,stamp(2)),/EEXIST/);assert.equal(await readFile(join(root,pending),'utf8'),'foreign pending');assert(!(await readdir(root)).includes(stamp(2)));assert.equal(await readFile(join(root,'index.json'),'utf8'),before);
 // A second fresh temporary directory models the successful transaction without touching the collision fixture.
 const fresh=await mkdtemp(join(root,'fresh-'));await writeFile(join(fresh,'index.json'),before);const updated=await persistDivisionBatch(fresh,raw,index,name);assert.equal(updated.snapshots.length,9);assert.equal(index.snapshots.length,0);assert.equal(expandSnapshotFile(JSON.parse(await readFile(join(fresh,name),'utf8')),{includeDerived:true}).length,16);
});

test('detail routing integration: shared filter, metric switching without rereads, hero/list return, mobile/PC HOT agree',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),detail=JSON.parse(await readFile(new URL('./fixtures/overfast-genji.json',import.meta.url),'utf8')),a=(await fixture(1)).batch,b=(await fixture(2)).batch,records=expandSnapshotFile(b,{includeDerived:true}),{service,reads}=archive([a,b]);
 const dom=new JSDOM(html,{url:'https://example.test/HOW/#/heroes/genji'}),prior={document:globalThis.document,window:globalThis.window,location:globalThis.location};Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});dom.window.HTMLDialogElement.prototype.close=function(){};
 const resizeListeners=new Set(),resize=()=>{for(const fn of resizeListeners)fn();};const media={matches:false,addEventListener(type,fn){resizeListeners.add(fn);},removeEventListener(type,fn){resizeListeners.delete(fn);}};window.matchMedia=()=>media;
 let router,controller,insights;const flush=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  const model=createHeroModel(),view=createHeroView(),preferences=new Map(),filterStorage=createFilterStorage(()=>({getItem:k=>preferences.get(k)??null,setItem:(k,v)=>preferences.set(k,v)}));insights=createInsightView();router=createRoutingController({model,detailView:createHeroDetailView(),detailService:{async getHero(key){const base=normalizeHeroDetail(detail,'genji'),identity=heroes.find(h=>h.key===key);return {detail:{...base,...identity,subrole:null},fetchedAt:'2026-11-02T00:00:00Z'};}},historyService:service});
  controller=createHeroController({model,view,filterStorage,service:{async getHeroes(){return {heroes};}},statisticsService:{async getStatistics(filters){const s=records.find(r=>statisticsQuery(r.filters)===statisticsQuery(filters));if(!s)throw new Error('fixture missing cohort');return {...s,fetchedAt:s.collectedAt,expiresAt:Date.parse('2026-11-04T00:00:00Z')};}},snapshotService:service,storage:{save(){return true;}},autoRefresh:false,onStateChange(){router.refresh();insights.render(model);}});
  router.start();controller.start();for(let i=0;i<8;i++)await flush();
  assert.equal(document.querySelector('#stats-division').value,'diamond_plus');assert.equal(document.querySelectorAll('#statistics-filters').length,1);assert(document.querySelector('#detail-filter-host #stats-division'));assert.equal(document.querySelectorAll('#pick-history .history-point').length,2);assert.match(document.querySelector('#hot-content').textContent,/겐지/);
  const before=reads.length;for(const metric of ['winRate','banRate','pickRate']){document.querySelector(`[data-history-metric="${metric}"]`).click();assert.equal(document.querySelector(`[data-history-metric="${metric}"]`).getAttribute('aria-pressed'),'true');assert.equal(document.querySelectorAll('#pick-history .history-point').length,2);}assert.equal(reads.length,before);
  const select=document.querySelector('#stats-division');select.value='master_plus';select.dispatchEvent(new window.Event('change',{bubbles:true}));for(let i=0;i<4;i++)await flush();assert.equal(model.state.statsFilters.division,'master_plus');assert.equal(document.querySelectorAll('#pick-history .history-point').length,2);
  location.hash='#/heroes/ana';window.dispatchEvent(new window.HashChangeEvent('hashchange'));for(let i=0;i<4;i++)await flush();assert.equal(document.querySelector('#hero-detail-page h1').textContent,'아나');assert.match(document.querySelector('#pick-history .history-current').textContent,/8\.0%/);assert.equal(select.value,'master_plus');
  location.hash='#/heroes/genji';window.dispatchEvent(new window.HashChangeEvent('hashchange'));for(let i=0;i<4;i++)await flush();select.value='diamond';select.dispatchEvent(new window.Event('change',{bubbles:true}));for(let i=0;i<4;i++)await flush();assert.equal(document.querySelectorAll('#pick-history .history-point').length,2);assert.equal(filterStorage.load().division,'diamond');
  const region=document.querySelector('#stats-region');region.value='europe';region.dispatchEvent(new window.Event('change',{bubbles:true}));for(let i=0;i<4;i++)await flush();assert.equal(model.state.statsStatus,'error');assert.equal(document.querySelectorAll('#pick-history .history-point').length,0);assert.equal(document.querySelector('#pick-history .history-current'),null);
  region.value='asia';region.dispatchEvent(new window.Event('change',{bubbles:true}));for(let i=0;i<4;i++)await flush();
  location.hash='#heroes';window.dispatchEvent(new window.HashChangeEvent('hashchange'));await flush();assert.equal(select.value,'diamond');assert(select.closest('#heroes'));
  const pcLinks=[...document.querySelectorAll('#hot-content .insight-hero')].map(a=>a.hash);Object.defineProperty(window,'innerWidth',{value:390});media.matches=true;resize();assert.deepEqual([...document.querySelectorAll('#hot-content .insight-hero')].map(a=>a.hash),pcLinks);assert.match(document.querySelector('#hot-content').textContent,/픽률 \+2.0%p/);assert.match(document.querySelector('#hot-content details').textContent,/승률 변화 \+1.0%p/);assert(document.querySelector('#meta-insights-host > .meta-insights'));
 }finally{controller?.stop();router?.stop();insights?.destroy();dom.window.close();Object.assign(globalThis,prior);}
});
