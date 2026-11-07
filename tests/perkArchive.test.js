import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPerkArchive,normalizePerkArchive,PERK_API_URL,PERK_ARCHIVE_FILE} from '../src/models/perkArchiveModel.js';
import {perkSelectionForItem} from '../src/models/perkSelectionModel.js';
import {collectOverlookerPerks} from '../scripts/collect-overlooker-perks.js';
import {createPerkStatisticsService} from '../src/services/perkStatisticsService.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/overlooker-perks.json',import.meta.url),'utf8'));
const identities=JSON.parse(await fs.readFile(new URL('./fixtures/overfast-perk-identities.json',import.meta.url),'utf8'));
const stored=JSON.parse(await fs.readFile(new URL('../public/data/perks/overlooker-perks.json',import.meta.url),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x)),time=Date.parse('2026-11-07T00:00:00Z');
const response=raw=>({ok:true,json:async()=>clone(raw),headers:{get:()=>null}});
test('live-collected same-origin archive: 54 heroes/216 current perks, original fractions/counts preserved and all localized cards join',()=>{
 const parsed=normalizePerkArchive(stored);assert.equal(parsed.frames.size,54);let total=0;
 for(const hero of identities)for(const tier of ['minor','major'])for(const item of hero[tier]){const entry=perkSelectionForItem(hero.key,tier,item,parsed.frames.get(hero.key),{date:stored.collectedAt.slice(0,10)});assert.equal(entry.status,'ready',`${hero.key} ${item.name}`);const tuple=stored.heroes[hero.key][tier].find(p=>p[0]===entry.providerPerkId);assert.equal(entry.selectionRate,tuple[1]*100);assert.equal(entry.selectionCount,tuple[2]);assert.equal(entry.sampleSize,null);assert.equal(entry.observedAt,null);total++;}
 assert.equal(total,216);assert.equal(stored.filters.queue_type,null);assert.equal(stored.providerSampleUnit,null);assert.equal(stored.requestUrl,PERK_API_URL);assert.equal(stored.heroCount,54);assert.equal(stored.perkCount,216);assert.equal(parsed.frames.get('genji').storage,'same-origin-json');
});
test('perk archive: compact common metadata, actual zero vs null and strict missing/malformed/new identity rejection',()=>{
 const data=clone(fixture);data.heroes[0].perks[0].pick_rate=0;data.heroes[0].perks[0].picks=0;data.heroes[0].perks[1].pick_rate=null;data.heroes[0].perks[1].picks=null;
 const archive=buildPerkArchive(data,{collectedAt:new Date(time).toISOString()});const frame=normalizePerkArchive(archive).frames.get('ana');assert.equal(frame.entries[0].selectionRate,0);assert.equal(frame.entries[0].selectionCount,0);assert.equal(frame.entries[1].selectionRate,null);assert.equal(frame.entries[1].selectionCount,null);assert.equal(frame.entries[1].status,'unavailable');
 const text=JSON.stringify(archive);assert(!text.includes('hero_name'));assert(!text.includes('description'));assert(!text.includes('"icon"'));assert.equal((text.match(/collectedAt/g)??[]).length,1);
 for(const corrupt of [r=>r.heroes.pop(),r=>r.heroes[0].perks.pop(),r=>r.heroes[0].perks[0].slug='removed_perk',r=>r.heroes[0].perks[0].tier='major',r=>r.heroes[0].perks[0].pick_rate=1.1,r=>r.heroes[0].perks[0].picks=-1,r=>delete r.heroes[0].perks[0].pick_rate]){const bad=clone(fixture);corrupt(bad);assert.throws(()=>buildPerkArchive(bad,{collectedAt:new Date(time).toISOString()}));}
 const bad=clone(archive);bad.heroes.ana.minor[0][0]='speed_serum';assert.throws(()=>normalizePerkArchive(bad));assert.throws(()=>normalizePerkArchive({...archive,mappingVersion:'unknown'}));assert.throws(()=>normalizePerkArchive({...archive,heroCount:53}));
});
async function temporary(run){const root=await fs.mkdtemp(join(tmpdir(),'how-perk-archive-'));try{await run(root);}finally{await fs.rm(root,{recursive:true,force:true});}}
test('perk collector: exact public request, first write, verified atomic replacement, change report and only one published file',()=>temporary(async root=>{
 let calls=0;const fetcher=async url=>{assert.equal(url,PERK_API_URL);calls++;return response(fixture)};
 const first=await collectOverlookerPerks({root,fetcher,now:()=>time});assert.equal(first.heroes,54);assert.equal(first.perks,216);assert.equal(first.firstCollection,true);
 const update=clone(fixture);update.heroes[0].perks[0].picks+=1;update.heroes[0].perks[0].pick_rate=.6;
 const second=await collectOverlookerPerks({root,fetcher:async()=>response(update),now:()=>time+60000});assert.equal(second.previous.heroes,54);assert(second.changes.some(c=>c.id===update.heroes[0].perks[0].slug));assert.equal(calls,1);
 const restored=normalizePerkArchive(JSON.parse(await fs.readFile(join(root,PERK_ARCHIVE_FILE),'utf8')));assert.equal(restored.frames.get('ana').entries[0].selectionRate,60);assert.deepEqual(await fs.readdir(root),[PERK_ARCHIVE_FILE]);
}));
test('perk collector: HTTP/JSON/mapping/timeout/rename failures leave normal file bytes intact, release only owned temporary/lock files',()=>temporary(async root=>{
 await collectOverlookerPerks({root,fetcher:async()=>response(fixture),now:()=>time});const path=join(root,PERK_ARCHIVE_FILE),before=await fs.readFile(path,'utf8');
 const incomplete=clone(fixture);incomplete.heroes.pop();
 for(const options of [
  {fetcher:async()=>({ok:false,status:429,headers:{get:()=> '120'}})},
  {fetcher:async()=>({ok:false,status:503,headers:{get:()=>null}})},
  {fetcher:async()=>({ok:true,json:async()=>{throw new SyntaxError('broken JSON')}})},
  {fetcher:async()=>response(incomplete)},
  {fetcher:()=>new Promise(()=>{}),timeoutMs:5},
  {fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})}),timeoutMs:5},
  {fetcher:async()=>response(fixture),io:{...fs,rename:async()=>{throw new Error('replace failure')}}},
 ]){await assert.rejects(collectOverlookerPerks({root,now:()=>time+1000,...options}));assert.equal(await fs.readFile(path,'utf8'),before);assert.deepEqual(await fs.readdir(root),[PERK_ARCHIVE_FILE]);}
 await fs.writeFile(join(root,'.collector.lock'),'existing owner');await assert.rejects(collectOverlookerPerks({root,fetcher:async()=>response(fixture)}));assert.equal(await fs.readFile(join(root,'.collector.lock'),'utf8'),'existing owner');
}));
test('same-origin service: one file for concurrent heroes, filters ignored, cached tabs/heroes and TTL refresh',async()=>{
 let calls=0,clock=time;const urls=[];const service=createPerkStatisticsService({base:'/HOW/',now:()=>clock,ttlMs:1000,fetcher:async url=>{calls++;urls.push(url);return response(stored)}});
 const [genji,ana]=await Promise.all([service.getHeroPerks('genji'),service.getHeroPerks('ana')]);assert.equal(calls,1);assert.equal(genji.heroKey,'genji');assert.equal(ana.heroKey,'ana');assert.equal(genji.collectedAt,stored.collectedAt);assert.equal(genji.fetchedAt,null);
 for(const region of ['asia','europe','americas'])for(const division of ['diamond_plus','master_plus','gold'])assert.deepEqual((await service.getHeroPerks('genji',{region,division,map:'busan'})).entries,genji.entries);
 assert.equal(calls,1);assert.deepEqual(urls,['/HOW/data/perks/overlooker-perks.json']);clock+=1001;await service.getHeroPerks('genji');assert.equal(calls,2);
 await assert.rejects(service.getHeroPerks('missing'));assert.throws(()=>createPerkStatisticsService({base:'https://third-party.invalid/'}));
});
test('same-origin service: file missing/invalid data/timeout have no external fallback and keep null unavailable',async()=>{
 for(const fetcher of [async()=>({ok:false,status:404}),async()=>response({...stored,perkCount:1}),async()=>{throw new TypeError('failed')}]){let calls=0;const s=createPerkStatisticsService({fetcher:async url=>{assert(url.startsWith('/data/perks/'));calls++;return fetcher()}});await assert.rejects(s.getHeroPerks('genji'));await assert.rejects(s.getHeroPerks('genji'));assert.equal(calls,1);}
 await assert.rejects(createPerkStatisticsService({timeoutMs:5,fetcher:()=>new Promise(()=>{})}).getHeroPerks('genji'),/초과/);
 const empty=clone(stored);empty.heroes.genji.minor[0][1]=null;empty.heroes.genji.minor[0][2]=null;const result=await createPerkStatisticsService({fetcher:async()=>response(empty)}).getHeroPerks('genji');assert.equal(result.entries[0].selectionRate,null);assert.equal(result.entries[0].status,'unavailable');
});
