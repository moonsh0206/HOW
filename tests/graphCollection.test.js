import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {collectGraphObservations} from '../scripts/lib/graphCollection.js';
import {readGraphBundle,mergeGraphAttempts} from '../scripts/lib/graphArchive.js';
import {normalizeStatistics} from '../src/models/statisticsModel.js';
const DAY=86400000,start=Date.parse('2026-10-01T00:00:00Z');
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'how-graph-collection-'));await writeFile(join(root,'index.json'),JSON.stringify({schemaVersion:1,snapshots:[]}));
 const ledgerPath=join(await mkdtemp(join(tmpdir(),'how-graph-attempts-')),'attempts.json');let clock=start,calls=0,fail=null;
 const options={root,ledgerPath,plan:{regions:['asia']},patch:null,heroKeys:['ana'],heroesService:{async getHeroes(){return {heroes:[{key:'ana'}]};}},now:()=>clock,dryRun:false,service:{async getStatistics(filters){calls++;if(fail)throw fail;return {filters,fetchedAt:new Date(clock).toISOString(),records:normalizeStatistics([{hero:'ana',winrate:51,pickrate:8,banrate:0}])};}}};
 return {options,setTime:t=>clock=t,setFailure:e=>fail=e,calls:()=>calls};
}
test('ordinary first collection, no duplicate request, flat weekly point retained, existing bytes untouched',async()=>{
 const f=await fixture();assert.equal((await collectGraphObservations(f.options)).updated,1);const before=await readGraphBundle(f.options.root);
 assert.equal((await collectGraphObservations(f.options)).updated,0);assert.equal(f.calls(),9);
 f.setTime(start+7*DAY);assert.equal((await collectGraphObservations(f.options)).updated,1);
 const after=await readGraphBundle(f.options.root);assert.equal(after.files.size,2);for(const [name,bytes] of before.files)assert.equal(after.files.get(name),bytes);
 for(const bytes of after.files.values()){const raw=JSON.parse(bytes);assert.equal(raw.observationPlan.targetPatch,null);assert(!('rankRoster' in raw));assert(!('rankPolicyId' in raw));}
});
test('D+1/D+3/D+7/D+14 and weekly use actual observations; missed intervals never backfilled',async()=>{
 const f=await fixture();f.options.patch={id:'fixture',type:'balance',effectiveAt:new Date(start).toISOString()};
 for(const day of [1,3,7,14,21,28]){f.setTime(start+day*DAY);const r=await collectGraphObservations(f.options);assert.equal(r.updated,1);assert.equal(r.results[0].decision.milestone,`D+${day}`);assert.equal((await collectGraphObservations(f.options)).updated,0);}
 const other=await fixture();other.options.patch=f.options.patch;other.setTime(start+8*DAY);const r=await collectGraphObservations(other.options);assert.equal(r.results[0].decision.milestone,'D+7');const raw=JSON.parse([...(await readGraphBundle(other.options.root)).files.values()][0]);assert.equal(raw.divisions.all.collectedAt,new Date(start+8*DAY).toISOString());assert.equal(raw.divisions.all.patch,null);
});
test('429 Retry-After survives restart; 503/timeout consume bounded attempts; partial data never published',async()=>{
 for(const message of ['HTTP 429','HTTP 503','timeout']){
  const f=await fixture(),error=Error(message);if(message.includes('429'))error.retryAt=start+2*3600000;f.setFailure(error);
  assert.equal((await collectGraphObservations(f.options)).failures,1);assert.equal((await readGraphBundle(f.options.root)).files.size,0);
  if(error.retryAt){f.setTime(start+3600000);assert.equal((await collectGraphObservations(f.options)).results[0].decision.reason,'provider-cooldown');assert.equal(f.calls(),9);f.setTime(error.retryAt);}
  assert.equal((await collectGraphObservations(f.options)).failures,1);assert.equal((await collectGraphObservations(f.options)).results[0].decision.reason,'attempt-budget');assert.equal(f.calls(),18);
  f.setTime(start+2*DAY);f.setFailure(null);assert.equal((await collectGraphObservations(f.options)).updated,1);
 }
});
test('new hero rejects before statistics; ledger persists; corrupt index blocks network; simulated apply clock rejected',async()=>{
 const f=await fixture();f.options.heroesService.getHeroes=async()=>({heroes:[{key:'ana'},{key:'new-hero'}]});
 await assert.rejects(collectGraphObservations(f.options),/roster changed/);assert.equal(f.calls(),0);assert.equal(JSON.parse(await readFile(f.options.ledgerPath)).length,1);
 await writeFile(join(f.options.root,'index.json'),JSON.stringify({schemaVersion:1,snapshots:[{file:'missing.json'}]}));await assert.rejects(collectGraphObservations(f.options));assert.equal(f.calls(),0);
 await assert.rejects(collectGraphObservations({...f.options,plan:{now:'2026-01-01'}}),/simulated clock/);
});
test('durable retry ledger merges updated metadata without counting one attempt twice',()=>{
 const a={region:'asia',at:new Date(start).toISOString()},b={...a,retryAt:new Date(start+DAY).toISOString()};assert.deepEqual(mergeGraphAttempts([a],[b]),[b]);assert.throws(()=>mergeGraphAttempts([{...a,region:'unknown'}]));
});
test('partial regional failure preserves only completed region and retries failed region independently',async()=>{
 const f=await fixture();f.options.plan.regions=['asia','europe'];const original=f.options.service.getStatistics;f.options.service.getStatistics=async filters=>{if(filters.region==='europe'&&filters.division==='master')throw Error('503 fixture');return original(filters);};
 const result=await collectGraphObservations(f.options);assert.equal(result.updated,1);assert.equal(result.failures,1);const before=await readGraphBundle(f.options.root);assert.equal(before.files.size,1);
 f.options.service.getStatistics=original;f.setTime(start+3600000);const next=await collectGraphObservations(f.options);assert.equal(next.updated,1);assert.equal(next.results[0].decision.collect,false);const after=await readGraphBundle(f.options.root);assert.equal(after.files.size,2);for(const [name,bytes] of before.files)assert.equal(after.files.get(name),bytes);
 await writeFile(join(f.options.root,'2026-01-01T00-00-00.000Z.json'),'{}');await assert.rejects(readGraphBundle(f.options.root),/Unindexed graph file/);
});
