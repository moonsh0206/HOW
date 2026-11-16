// Real API → temporary archive → production build → HTTP/browser loader rehearsal.
// No source snapshot mutation and no GitHub writes or deployment.
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createOverfastService} from '../src/services/heroService.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {rateStatus} from '../src/models/statisticsQuality.js';
import {buildObservationTimeline} from '../src/models/patchHistoryModel.js';
import {collectGraphObservations} from './lib/graphCollection.js';
import {readGraphBundle} from './lib/graphArchive.js';
import roster from '../src/data/subroles.json' with {type:'json'};
if(!process.argv.includes('--run')){console.log('Use --run: 1 real hero roster + 9 statistics requests, temporary production build and local HTTP checks. No remote publication.');process.exit(0);}
const original=await readGraphBundle('public/data/snapshots');
const root=await mkdtemp(join(tmpdir(),'how-graph-live-')),publicDir=join(root,'public');await cp(resolve('public'),publicDir,{recursive:true});
const archiveRoot=join(publicDir,'data/snapshots');
const result=await collectGraphObservations({root:archiveRoot,ledgerPath:join(root,'attempts.json'),plan:{regions:['asia']},patch:null,heroKeys:Object.keys(roster.heroes),heroesService:createOverfastService({locale:()=> 'ko-kr'}),service:createStatisticsService(),dryRun:false});
assert.equal(result.status,'collected',JSON.stringify(result));assert.equal(result.updated,1);
// Read again as a subsequent execution would, independent of the collector's objects.
const durable=await readGraphBundle(archiveRoot);assert.equal(durable.files.size,original.files.size+1);
const {build}=await import('vite');
await build({configFile:false,root:resolve('.'),base:'/HOW/',publicDir,logLevel:'silent',build:{outDir:join(root,'dist'),emptyOutDir:true}});
const deployed=await readGraphBundle(join(root,'dist/data/snapshots'));
const server=createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname.split('/').at(-1);try{const bytes=await readFile(join(root,'dist/data/snapshots',/^\d{4}-[\dTZ.-]+\.json$/.test(name)?name:name==='index.json'?name:'invalid'));res.setHeader('content-type','application/json');res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const base=`http://127.0.0.1:${server.address().port}/HOW/`,service=createSnapshotService({base});
 const history=await service.getHistory(DEFAULT_FILTERS,{scope:'compare'});assert.equal(history.warnings.length,0);
 const latest=history.snapshots.at(-1);assert.equal(latest.records.length,Object.keys(roster.heroes).length);assert.equal(latest.components.length,3);assert.equal(latest.patch,null);
 const selected=latest.records.find(r=>['winRate','pickRate','banRate'].every(metric=>rateStatus(r,metric)==='available'));
 assert(selected,'No usable three-metric hero');
 for(const metric of ['winRate','pickRate','banRate']){const graph=buildObservationTimeline(history.snapshots,selected.hero,DEFAULT_FILTERS,{metric});assert.equal(graph.points.at(-1).value,selected[metric]);assert.equal(graph.points.at(-1).verificationStatus,'unverified');}
 for(const [name,bytes] of original.files){assert.equal(deployed.files.get(name),bytes);const response=await fetch(base+'data/snapshots/'+name);assert.equal(await response.text(),bytes);}
 const after=await readGraphBundle('public/data/snapshots');assert.deepEqual([...after.files],[...original.files]);assert.deepEqual(after.index,original.index);
 const report={checkedAt:new Date().toISOString(),source:'real OverFast API; automatic collection orchestrator, temporary production build and HTTP publication',region:'asia',heroes:latest.records.length,statisticsRequests:9,newOriginalDivisions:9,derivedComponents:3,metricHero:selected.hero,metrics:['winRate','pickRate','banRate'],protectedFiles:original.files.size,protectedFilesUnchanged:true,remoteDurabilityTested:false,remoteDeploymentTested:false,temporaryArchive:root,collection:result,sourceDigest:createHash('sha256').update([...original.files.values()].join('')).digest('hex')};
 await mkdir('docs/qa/graph-automation',{recursive:true});await writeFile('docs/qa/graph-automation/live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await new Promise(resolve=>server.close(resolve));}
