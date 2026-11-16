// Real API collection; local publication rehearsal only. No GitHub writes or deployment.
// Run on consecutive reporting days with the same directory to verify real deltas.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createOverfastService} from '../src/services/heroService.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {createDailyRankService} from '../src/services/dailyRankService.js';
import {collectDailyRanks} from './lib/dailyRanks.js';
import {writeRankArchive,restorePublishedRanks} from './lib/rankFiles.js';

const args=process.argv.slice(2);
if(!args.includes('--run')){console.log('Use --run for 1 heroes + up to 27 real statistics requests; optional --published-url HTTPS_URL. Writes only test-results/daily-ranks-live.');process.exit(0);}
const root=resolve('test-results/daily-ranks-live');await mkdir(root,{recursive:true});
const file=pathToFileURL(join(root,'current.json'));
let previous={schemaVersion:1,cohorts:[]};
try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const published=args.indexOf('--published-url');
if(published>=0)previous=await restorePublishedRanks(args[published+1]);
async function protectedDigest(){
 const hash=createHash('sha256');
 async function visit(path){for(const entry of (await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const child=join(path,entry.name);if(entry.isDirectory())await visit(child);else hash.update(child).update(await readFile(child));}}
 await visit('public/data/snapshots');return hash.digest('hex');
}
const before=await protectedDigest();
const {heroes}=await createOverfastService({locale:()=> 'ko-kr'}).getHeroes();
const result=await collectDailyRanks({service:createStatisticsService(),heroes,previous});
assert(result.updated>0||result.archive.cohorts.length>0,'No usable real ranks collected');
assert.equal(result.failures.length,0,JSON.stringify(result.failures));
assert.equal(result.archive.cohorts.length,48);
assert.doesNotMatch(JSON.stringify(result.archive),/winRate|pickRate|banRate|records/);
// Atomic local publication, then read via actual HTTP using the browser's loader.
await writeRankArchive(file,result.archive);
const server=createServer(async(_req,res)=>{res.setHeader('content-type','application/json');res.end(await readFile(file));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const archive=await createDailyRankService({base:`http://127.0.0.1:${server.address().port}/`}).get();
 assert.deepEqual(archive,result.archive);
 const rerun=await collectDailyRanks({service:{getStatistics(){throw Error('Duplicate collection');}},heroes,previous:archive});
 assert.equal(rerun.requests,0);
 assert.equal(await protectedDigest(),before,'Graph/HOT snapshot bytes changed');
 const report={checkedAt:new Date().toISOString(),mode:'real-api-local-publication',requests:result.requests,updated:result.updated,cohorts:archive.cohorts.length,comparisons:archive.cohorts.filter(c=>c.comparison).length,protectedSnapshotDigest:before,remoteDeploymentTested:false};
 await writeFile(join(root,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await new Promise(resolve=>server.close(resolve));}
