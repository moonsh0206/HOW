import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {patchCollectionDue,collectionDecision,patchMilestones} from '../src/models/patchCollectionModel.js';
import {DEFAULT_FILTERS,ALL_RANK_FILTERS,statisticsQuery} from '../src/models/statisticsModel.js';
import {collectPatch} from '../scripts/lib/patchCollector.js';
import roles from '../src/data/subroles.json' with {type:'json'};
const patch={id:'test-patch',officialId:'patch-test',type:'balance',effectiveAt:'2026-11-03T23:30:00Z',sourceUrl:'https://overwatch.blizzard.com/en-us/news/patch-notes/'};
const due=Date.parse('2026-11-04T23:30:00Z');
const raw=Object.keys(roles.heroes).map(hero=>({hero,winrate:50,pickrate:0,banrate:null}));
async function temp(t){const root=await mkdtemp(join(tmpdir(),'how-patch-test-'));t.after(async()=>{if(dirname(resolve(root))!==resolve(tmpdir())||!basename(root).startsWith('how-patch-test-'))throw new Error('Unsafe temp cleanup');await rm(root,{recursive:true,force:true});});return root;}
test('patch timing: publication is not application; 24h and KST next day both required',()=>{
 assert.equal(patchCollectionDue({...patch,effectiveAt:null,publishedDate:'2026-11-03'}),null);
 assert.equal(patchCollectionDue(patch),due);
 assert.equal(collectionDecision(patch,[],DEFAULT_FILTERS,statisticsQuery,due-1).collect,false);
 assert.equal(collectionDecision(patch,[],DEFAULT_FILTERS,statisticsQuery,due).collect,true);
 assert.equal(patchCollectionDue({...patch,effectiveAt:'2026-11-03T14:59:00Z'}),Date.parse('2026-11-04T14:59:00Z'));
 assert.equal(patchCollectionDue({...patch,type:'bugfix'}),null);
 assert.deepEqual(patchMilestones(patch).map(row=>row.day),[1,3,7]);
 assert.deepEqual(patchMilestones({...patch,effectiveAt:null}),[]);
});
test('patch collector: skip unknown timing without API, save unverified 54 diamond rows, daily retry and atomic index',async t=>{
 const root=await temp(t);let calls=0;const fetcher=async()=>{calls++;return{ok:true,headers:new Headers(),json:async()=>raw};};
 assert.equal((await collectPatch({patch:{...patch,effectiveAt:null},root,fetcher})).collect,false);assert.equal(calls,0);
 const result=await collectPatch({patch,root,fetcher,now:()=>due});assert.equal(result.verified,false);
 const index=JSON.parse(await readFile(join(root,'index.json'),'utf8')),snapshot=JSON.parse(await readFile(join(root,result.file),'utf8'));
 assert.equal(snapshot.filters.division,'diamond');assert.equal(snapshot.patch,null);assert.equal(snapshot.patchVerification.status,'unverified');assert.equal(snapshot.records.length,54);assert.equal(index.snapshots.length,1);
 assert.equal((await collectPatch({patch,root,fetcher,now:()=>due+1000})).reason,'daily-retry-limit');assert.equal(calls,1);
 const before=await readFile(join(root,'index.json'),'utf8');await assert.rejects(collectPatch({patch,root,now:()=>due+86400000,fetcher:async()=>({ok:false,status:503})}));assert.equal(await readFile(join(root,'index.json'),'utf8'),before);
});
test('patch collector: explicit upstream proof locks first representative; all ranks never satisfy diamond dedup',async t=>{
 const root=await temp(t),proof={status:'verified',catalogId:patch.id,sourceUrl:patch.sourceUrl,verifiedAt:new Date(due).toISOString(),statisticsWindow:'since-patch-start',upstreamPatchId:patch.officialId,evidenceUrl:'https://overwatch.blizzard.com/en-us/rates/'};
 const allAt=new Date(due-1000).toISOString(),allFile=allAt.replaceAll(':','-')+'.json';
 await writeFile(join(root,allFile),JSON.stringify({schemaVersion:1,source:'OverFast API',patch:null,aggregateAt:null,filters:ALL_RANK_FILTERS,collectedAt:allAt,records:raw}));
 await writeFile(join(root,'index.json'),JSON.stringify({schemaVersion:1,snapshots:[{file:allFile,targetPatch:patch.id,representativeKind:'first-confirmed-after-day-one',filters:ALL_RANK_FILTERS,collectedAt:allAt}]}));
 const result=await collectPatch({patch,root,proof,now:()=>due,fetcher:async()=>({ok:true,headers:new Headers(),json:async()=>raw})});assert.equal(result.verified,true);
 assert.equal((await collectPatch({patch,root,proof,now:()=>due+86400000,fetcher:()=>{throw new Error('must not fetch');}})).reason,'representative-already-preserved');
 const snapshot=JSON.parse(await readFile(join(root,result.file),'utf8'));assert.equal(snapshot.patch,patch.id);assert.equal(snapshot.representativeKind,'first-confirmed-after-day-one');
});
