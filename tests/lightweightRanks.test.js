import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {restorePublishedRanks,writeRankArchive} from '../scripts/lib/rankFiles.js';
import YAML from 'yaml';
import {collectDailyRanks} from '../scripts/lib/dailyRanks.js';
import {buildRankFrame,validateRankArchive,storedRankChanges,RANK_ROLES} from '../src/models/rankArchiveModel.js';
import {createDailyRankService} from '../src/services/dailyRankService.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {confirmRankPublication,rankDigest} from '../scripts/lib/rankPublication.js';
const heroes=RANK_ROLES.flatMap(role=>[0,1,2].map(i=>({key:`${role}-${i}`,name:`${role}-${i}`,role})));
const time=day=>`2026-11-${String(day).padStart(2,'0')}T01:03:00.000Z`;
const filters={platform:'pc',gamemode:'competitive',region:'asia',division:'diamond',map:'all'};
const frame=(day,reverse=false,f=filters)=>({filters:f,fetchedAt:time(day),patch:null,statisticsWindow:'unverified-patch-window',providerAgeSeconds:30,records:heroes.map(h=>{let i=Number(h.key.at(-1));if(reverse)i=2-i;return {hero:h.key,winRate:60-i*5,pickRate:20-i*5,banRate:10-i*3};})});
const service=(day,reverse=false,fail=false)=>({async getStatistics(f){if(fail)throw Error('fixture 429');return frame(day,reverse,f);}});

test('publication confirmation rejects stale CDN files and unavailable publication; retries confirm exact candidate',async()=>{
 const expected={schemaVersion:1,cohorts:[]};let calls=0,waits=0;
 const receipt=await confirmRankPublication({expected,url:'https://example.org/HOW/data/ranks/current.json',runId:'123',attempts:2,delay:async()=>{waits++;},restore:async url=>{assert.equal(url.searchParams.get('publication'),`123-${calls}`);return calls++===0?{...expected,generatedAt:'old'}:expected;}});
 assert.equal(calls,2);assert.equal(waits,1);assert.equal(receipt.rankDigest,rankDigest(expected));assert(receipt.publishedAt);
 await assert.rejects(confirmRankPublication({expected,url:'https://example.org/ranks.json',attempts:1,restore:async()=>({...expected,generatedAt:'stale'})}),/differs/);
 await assert.rejects(confirmRankPublication({expected,url:'https://example.org/ranks.json',attempts:1,restore:async()=>{throw Error('503');}}),/503/);
});
test('first day, second day, independent roles, +2/-2/zero and no source rates persisted',async()=>{
 const first=await collectDailyRanks({service:service(12),heroes,previous:{schemaVersion:1,cohorts:[]},now:()=>Date.parse(time(12))});
 assert.equal(first.requests,27);assert.equal(first.archive.cohorts.length,48);assert(first.archive.cohorts.every(c=>c.comparison===null));
 const second=await collectDailyRanks({service:service(13,true),heroes,previous:first.archive,now:()=>Date.parse(time(13))});assert.equal(second.requests,27);assert.equal(second.archive.cohorts.length,48);
 const row=second.archive.cohorts.find(c=>c.filters.region==='asia'&&c.filters.division==='diamond_plus');for(const role of RANK_ROLES){assert.equal(row.comparison.deltas[role][`${role}-2`],2);assert.equal(row.comparison.deltas[role][`${role}-0`],-2);assert.equal(row.comparison.deltas[role][`${role}-1`],0);}
 const raw=JSON.stringify(second.archive);assert.doesNotMatch(raw,/winRate|pickRate|banRate|records/);assert.equal(row.cache[0].ageSeconds,30);
 assert.equal((await collectDailyRanks({service:service(13),heroes,previous:second.archive,now:()=>Date.parse(time(13))})).requests,0);
});
test('failures preserve last baseline, next valid day gap/policy/roster change suppresses comparisons',async()=>{
 const old=buildRankFrame({heroes,current:frame(12)}),archive={schemaVersion:1,cohorts:[old]};
 const failed=await collectDailyRanks({service:service(13,false,true),heroes,previous:archive,now:()=>Date.parse(time(13))});assert.equal(failed.updated,0);assert.deepEqual(failed.archive.cohorts,[old]);
 assert.equal(buildRankFrame({heroes,current:frame(14),previous:old}).comparison,null);
 assert.equal(buildRankFrame({heroes,current:frame(13),previous:{...old,policyId:'older'}}).comparison,null);
 const changed=heroes.map(h=>h.key==='damage-0'?{...h,role:'support'}:h);assert.equal(buildRankFrame({heroes:changed,current:frame(13),previous:old}).comparison,null);
 const added=[...heroes,{key:'new-hero',name:'New hero',role:'support'}],newFrame=frame(13);newFrame.records.push({hero:'new-hero',winRate:52,pickRate:5,banRate:0});assert.equal(buildRankFrame({heroes:added,current:newFrame,previous:old}).comparison,null);
 assert.throws(()=>buildRankFrame({heroes,current:{...frame(13),records:[]}}),/Incomplete/);
 const missing=frame(13);missing.records[0].winRate=null;assert.equal(buildRankFrame({heroes,current:missing,previous:old}).ranks.tank,null);
});
test('stored ranks drive existing UI eligibility, exact live order guard, stale dates and cohort filters',()=>{
 const old=buildRankFrame({heroes,current:frame(12)}),current=buildRankFrame({heroes,current:frame(13,true),previous:old}),archive={schemaVersion:1,cohorts:[current]};
 const model=createHeroModel();Object.assign(model.state,{heroes,statsFilters:filters,statistics:frame(13,true),role:'tank'});const sorted=model.sortedHeroes();
 const input={archive,heroes,filters,role:'tank',sorted,now:time(13)};assert.equal(storedRankChanges(input).get('tank-2').delta,2);
 for(const extra of [{role:'all'},{now:time(14)},{filters:{...filters,region:'europe'}},{sorted:[...sorted].reverse()}])assert.equal(storedRankChanges({...input,...extra}).size,0);
 // Eligibility in Model is tested at the actual wall clock without inventing source history.
 Object.assign(model.state,{dailyRankArchive:{schemaVersion:1,cohorts:[]},role:'all'});assert.equal(model.listSelection().changes.size,0);model.state.role='tank';model.state.sort='meta-desc';assert.equal(model.listSelection().changes.size,0);
});
test('rank archive validation rejects corrupt deltas and duplicate cohorts; service shares request and BASE_URL',async()=>{
 const a=buildRankFrame({heroes,current:frame(12)}),b=buildRankFrame({heroes,current:frame(13),previous:a});assert.throws(()=>validateRankArchive({schemaVersion:1,cohorts:[a,a]}));
 const corrupt=structuredClone(b);corrupt.comparison.deltas.tank['tank-0']=99;assert.throws(()=>validateRankArchive({schemaVersion:1,cohorts:[corrupt]}));
 for(const target of ['filters','roster','ranks','comparison']){const nested=structuredClone(b);nested[target].winRate=52;assert.throws(()=>validateRankArchive({schemaVersion:1,cohorts:[nested]}));}
 const cache=structuredClone(b);cache.cache[0].records=[];assert.throws(()=>validateRankArchive({schemaVersion:1,cohorts:[cache]}));
 let calls=0;const provider=createDailyRankService({base:'/HOW/',fetcher:async url=>{calls++;assert.equal(url,'/HOW/data/ranks/current.json');return {ok:true,json:async()=>({schemaVersion:1,cohorts:[b]})};}});const first=provider.get();assert.equal(first,provider.get());await first;await provider.get();assert.equal(calls,1);
});
test('gated operating publisher and all Pages builders preserve published ranks and one shared deployment lock',async()=>{
 const proposed=YAML.parse(await readFile('docs/proposals/daily-rank-publisher.yml.example','utf8'));assert.equal(proposed.on.schedule[0].cron,'0 1 * * *');assert.equal(proposed.concurrency.group,'pages');assert.equal(proposed.permissions.contents,'read');
 const steps=proposed.jobs.publish.steps;assert(steps.find(s=>s.run?.includes('--restore-url')));const deploy=steps.findIndex(s=>s.id==='deployment'),receipt=steps.findIndex(s=>s.run?.includes('publishedAt'));assert(receipt>deploy);assert(!JSON.stringify(proposed).includes('git push'));
 for(const file of ['pages.yml','official-patch-notes.yml']){const data=await readFile('.github/workflows/'+file,'utf8');assert.match(data,/--restore-only --restore-url/);assert.match(data,/HOW_RANKS_ENABLED/);assert.match(data,/group: pages/);}
 const operating=YAML.parse(await readFile('.github/workflows/daily-ranks.yml','utf8'));
 assert.equal(operating.on.schedule[0].cron,'0 1 * * *');
 assert.equal(operating.concurrency.group,'pages');
 assert.match(operating.jobs.publish.if,/HOW_RANKS_ENABLED.*refs\/heads\/main/);
 const liveSteps=operating.jobs.publish.steps;
 assert(liveSteps.findIndex(s=>s.run==='node scripts/verify-rank-publication.js')>liveSteps.findIndex(s=>s.id==='deployment'));
 assert(!JSON.stringify(operating).includes('git push'));
});
test('failed restore/atomic replacement preserves baseline bytes; successful replacement keeps only one latest file',async()=>{
 const root=await mkdtemp(join(tmpdir(),'how-rank-publication-')),file=pathToFileURL(join(root,'current.json'));
 const a=buildRankFrame({heroes,current:frame(12)}),b=buildRankFrame({heroes,current:frame(13,true),previous:a});
 await writeRankArchive(file,{schemaVersion:1,cohorts:[a]});const before=await readFile(file,'utf8');
 await assert.rejects(restorePublishedRanks('https://example.org/ranks.json',{fetcher:async()=>({ok:false,status:503})}));assert.equal(await readFile(file,'utf8'),before);
 await assert.rejects(writeRankArchive(file,{schemaVersion:1,cohorts:[b]},{replace:async()=>{throw Error('simulated publication replacement failure');}}));assert.equal(await readFile(file,'utf8'),before);assert.deepEqual(await readdir(root),['current.json']);
 await writeRankArchive(file,{schemaVersion:1,cohorts:[b]});assert.equal(JSON.parse(await readFile(file,'utf8')).cohorts[0].date,'2026-11-13');assert.deepEqual(await readdir(root),['current.json']);
});
