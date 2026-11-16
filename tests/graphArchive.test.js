import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import YAML from 'yaml';
import {GRAPH_BRANCH,readGraphBundle,validateGraphBundle,mergeGraphBundles,installGraphBundle,createGraphRepository,verifyGraphPublication} from '../scripts/lib/graphArchive.js';
import {assertGraphRoster,collectDivisionBatch} from '../scripts/lib/divisionBatch.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {normalizeStatistics} from '../src/models/statisticsModel.js';
const empty=()=>({index:{schemaVersion:1,snapshots:[]},files:new Map()});
function fakeGit(){
 let sequence=0,head=null,refFailure=false;const blobs=new Map(),trees=new Map(),commits=new Map(),calls=[];
 const id=()=>String(++sequence).padStart(40,'0'),response=(data,status=200)=>({ok:status<300,status,json:async()=>data,text:async()=>typeof data==='string'?data:JSON.stringify(data)});
 return {calls,get head(){return head;},failRef(){refFailure=true;},fetcher:async(url,options={})=>{
  const parsed=new URL(url),method=options.method??'GET',body=options.body?JSON.parse(options.body):undefined;calls.push({path:parsed.pathname,method,body});
  if(parsed.hostname==='raw.githubusercontent.com'){const [,,sha,...rest]=parsed.pathname.slice(1).split('/');const entry=trees.get(commits.get(sha)?.tree)?.find(e=>e.path===rest.join('/'));return entry?response(blobs.get(entry.sha)):response({},404);}
  const path=parsed.pathname.split('/test/HOW/')[1];
  if(path===`git/ref/heads/${GRAPH_BRANCH}`)return head?response({object:{sha:head}}):response({},404);
  if(path==='git/blobs'){const sha=id();blobs.set(sha,body.content);return response({sha});}
  if(path==='git/trees'){const sha=id(),entries=new Map((trees.get(body.base_tree)??[]).map(e=>[e.path,e]));for(const e of body.tree)entries.set(e.path,e);trees.set(sha,[...entries.values()]);return response({sha});}
  if(path.startsWith('git/commits/')){const commit=commits.get(path.split('/').at(-1));return response({...commit,tree:{sha:commit.tree}});}
  if(path==='git/commits'){const sha=id();commits.set(sha,body);return response({sha});}
  if(path==='git/refs'||path===`git/refs/heads/${GRAPH_BRANCH}`){if(refFailure||head&&commits.get(body.sha).parents[0]!==head)return response({},422);head=body.sha;return response({object:{sha:head}});}
  throw Error(`Unexpected fake Git request ${path}`);
 }};
}

test('graph public verification retries a stale index and rejects missing or changed original bytes',async()=>{
 const expected=await readGraphBundle('public/data/snapshots');let indexCalls=0,waits=0;
 const fetcher=async url=>new URL(url).pathname.endsWith('index.json')?{ok:true,json:async()=>++indexCalls===1?{schemaVersion:1,snapshots:[]}:expected.index}:{ok:true,text:async()=>expected.files.get(new URL(url).pathname.split('/').at(-1))};
 assert.equal((await verifyGraphPublication({base:'https://example.org/data/snapshots/',expected,fetcher,delay:async()=>{waits++;}})).files,expected.files.size);assert.equal(waits,1);
 await assert.rejects(verifyGraphPublication({base:'https://example.org/data/snapshots/',expected,attempts:1,fetcher:async()=>({ok:false,status:503})}),/503/);
 await assert.rejects(verifyGraphPublication({base:'https://example.org/data/snapshots/',expected,attempts:1,fetcher:async url=>new URL(url).pathname.endsWith('index.json')?{ok:true,json:async()=>expected.index}:{ok:true,text:async()=> 'changed'}}),/differs/);
});

test('actual existing archive validates; immutable union never deletes or rewrites protected source bytes',async()=>{
 const bundle=await readGraphBundle('public/data/snapshots');assert(bundle.files.size>=5);assert(bundle.index.snapshots.length>=29);
 const merged=mergeGraphBundles(bundle,empty());assert.deepEqual([...merged.files],[...bundle.files]);
 const bad={...bundle,files:new Map(bundle.files)};bad.files.set([...bad.files.keys()][0],'{}');assert.throws(()=>mergeGraphBundles(bundle,bad));
 assert.throws(()=>validateGraphBundle({index:{schemaVersion:1,snapshots:[{file:'../unsafe.json'}]},files:new Map()}));
 const root=await mkdtemp(join(tmpdir(),'how-graph-archive-'));await cp('public/data/snapshots',root,{recursive:true});
 await installGraphBundle(root,bundle);assert.deepEqual([...(await readGraphBundle(root)).files],[...bundle.files]);
});

test('fixture collection of all 54 heroes survives durable Git store, next-run restore and derived recovery',async()=>{
 const rows=normalizeStatistics(JSON.parse(await readFile('tests/fixtures/overfast-stats.json','utf8'))),keys=rows.map(r=>r.hero);assert.equal(keys.length,54);
 let requests=0;const raw=await collectDivisionBatch({heroKeys:keys,now:()=>Date.parse('2026-11-17T02:00:00Z'),service:{async getStatistics(filters){requests++;return {filters,records:rows,fetchedAt:'2026-11-17T02:00:00.000Z'};}}});assert.equal(requests,9);
 const original=await readGraphBundle('public/data/snapshots'),file='2026-11-17T02-00-00.000Z.json';
 const frames=expandSnapshotFile(raw),candidate=mergeGraphBundles(original,{index:{schemaVersion:1,snapshots:frames.map(s=>({file,filters:s.filters,collectedAt:s.collectedAt}))},files:new Map([[file,JSON.stringify(raw)]])});
 const fake=fakeGit(),repository=createGraphRepository({repo:'test/HOW',token:'fixture-token',fetcher:fake.fetcher});
 const baseline=await repository.read({bootstrap:true});const sha=await repository.persist(baseline,candidate,[{region:'asia',at:raw.divisions.diamond.collectedAt}]);
 const restored=await repository.read();assert.equal(restored.sha,sha);assert.equal(restored.bundle.files.size,original.files.size+1);assert.equal(restored.attempts.length,1);
 assert.equal(expandSnapshotFile(JSON.parse(restored.bundle.files.get(file)),{includeDerived:true}).length,16);
 for(const frame of frames){assert.equal(frame.records.length,54);assert.equal(frame.filters.region,'asia');assert.equal(frame.filters.map,'all');assert.equal(frame.patch,null);}
 for(const [name,bytes] of original.files)assert.equal(restored.bundle.files.get(name),bytes);
 const before=fake.calls.length;assert.equal(await repository.persist(restored,candidate,restored.attempts),sha);assert.equal(fake.calls.length,before,'No-op must not create another commit');
 const update=structuredClone(restored.attempts);update.push({region:'asia',at:'2026-11-18T02:00:00Z'});fake.failRef();
 await assert.rejects(repository.persist(restored,candidate,update),/422/);assert.equal(fake.head,sha,'Failed publication must preserve durable baseline');
 for(const call of fake.calls.filter(c=>c.method==='PATCH')){assert.equal(call.body.force,false);assert(call.path.endsWith(GRAPH_BRANCH));}
 const tree=fake.calls.find(c=>c.path.endsWith('git/trees')).body.tree;assert(tree.every(e=>e.path==='index.json'||e.path==='attempts.json'||/^\d{4}-/.test(e.path)));assert(!JSON.stringify(tree).includes('ranks'));
});

test('missing/corrupt remote archive fails closed; bootstrap must be explicit; roster additions and partial API batches preserve old data',async()=>{
 const fake=fakeGit(),repository=createGraphRepository({repo:'test/HOW',fetcher:fake.fetcher});await assert.rejects(repository.read(),/404/);
 assertGraphRoster(['ana'],[{key:'ana'}]);assert.throws(()=>assertGraphRoster(['ana'],[{key:'ana'},{key:'new-hero'}]),/roster changed/);
 const raw=await collectDivisionBatch({heroKeys:['ana'],service:{async getStatistics(filters){if(filters.division==='master')throw Error('fixture timeout');return {filters,records:[{hero:'ana',winRate:null,pickRate:5,banRate:0}],fetchedAt:'2026-11-16T02:00:00.000Z'};}}});
 assert.equal(raw.collection.status,'partial');assert.equal(raw.divisions.master.records,null);assert.equal(raw.divisions.diamond.records[0][0],null);
 assert(!expandSnapshotFile(raw,{includeDerived:true}).some(f=>f.filters.division==='diamond_plus'));
});

test('all publishers restore durable history and share lock; permanent write precedes deployment and public verification follows it',async()=>{
 for(const name of ['pages','daily-ranks','official-patch-notes','graph-snapshots']){
  const workflow=YAML.parse(await readFile(`.github/workflows/${name}.yml`,'utf8'));assert.equal(workflow.concurrency.group,'pages');
  assert(JSON.stringify(workflow).includes('node scripts/graph-archive.js restore'));
 }
 const graph=YAML.parse(await readFile('.github/workflows/graph-snapshots.yml','utf8')),steps=graph.jobs.publish.steps;
 assert.match(graph.jobs.publish.if,/HOW_GRAPH_ARCHIVE_ENABLED/);assert.equal(graph.on.schedule[0].cron,'17 * * * *');
 const persist=steps.findIndex(s=>s.run?.includes('persist --apply')),deploy=steps.findIndex(s=>s.id==='deployment'),verify=steps.findIndex(s=>s.run?.includes('verify-public'));
 assert(persist<deploy&&verify>deploy);assert.deepEqual(steps.filter(s=>s['continue-on-error']).map(s=>s.id),['collection']);
 const failGate=steps.findIndex(s=>s.if==="steps.collection.outcome == 'failure'"&&s.run==='exit 1');assert(failGate>persist&&failGate<deploy);
 assert.equal(steps.find(s=>s.id==='deployment').if,"steps.publication.outputs.needed == 'true'");
 assert(steps.find(s=>s.id==='publication').run.includes('publication-needed'));
});
