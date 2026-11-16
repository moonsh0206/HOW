// Read-only operating diagnosis. Saves metadata/reasons, never collected source rates.
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createSnapshotService} from '../src/services/snapshotService.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {createOverfastService} from '../src/services/heroService.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {DEFAULT_FILTERS,statisticsQuery} from '../src/models/statisticsModel.js';
import {hotHeroes} from '../src/domain/insights.js';

if(!process.argv.includes('--live')){console.log('Use --live for read-only Pages/GitHub/OverFast checks. No deployment, workflow execution or operating-data writes.');process.exit(0);}
const base='https://moonsh0206.github.io/HOW/',api='https://api.github.com/repos/moonsh0206/HOW/';
async function request(url){const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000)});const text=await response.text();let data;try{data=JSON.parse(text);}catch{}return {status:response.status,age:response.headers.get('age'),cacheControl:response.headers.get('cache-control'),data};}
async function hashes(){const result={};for(const name of await readdir('public/data/snapshots'))result[name]=createHash('sha256').update(await readFile('public/data/snapshots/'+name)).digest('hex');return result;}
const protectedBefore=await hashes(),report={checkedAt:new Date().toISOString(),base,remoteChanges:false};
const index=await request(base+'data/snapshots/index.json');
if(index.status!==200)throw Error(`Public snapshot index HTTP ${index.status}`);
const cohorts=new Map();for(const entry of index.data.snapshots){const key=statisticsQuery(entry.filters),old=cohorts.get(key);if(!old||Date.parse(old)<Date.parse(entry.collectedAt))cohorts.set(key,entry.collectedAt);}
report.snapshots={entries:index.data.snapshots.length,latestByCohort:Object.fromEntries(cohorts),latestAt:[...cohorts.values()].sort().at(-1)};
report.ranks={};for(const suffix of ['',`?diagnostic=${Date.now()}`]){const result=await request(base+'data/ranks/current.json'+suffix);report.ranks[suffix?'cacheBusted':'ordinary']={status:result.status,age:result.age,cacheControl:result.cacheControl,generatedAt:result.data?.generatedAt,cohorts:result.data?.cohorts?.length};}
const main=await request(api+'commits/main');report.main={status:main.status,sha:main.data?.sha,date:main.data?.commit?.committer?.date};
const workflows=await request(api+'contents/.github/workflows');report.workflowFiles={status:workflows.status,names:workflows.data?.map?.(x=>x.name)};
const runs=await request(api+'actions/runs?per_page=100');report.runs={status:runs.status,total:runs.data?.total_count,items:runs.data?.workflow_runs?.map(({name,path,event,status,conclusion,created_at,html_url,head_sha})=>({name,path,event,status,conclusion,created_at,html_url,head_sha}))};
// Values require authenticated Actions-variable access, which the available connector lacks.
report.variables={HOW_RANKS_URL:'not-readable-with-available-connector',HOW_RANKS_ENABLED:'not-readable-with-available-connector'};
const statistics=createStatisticsService(),history=createSnapshotService({base});
const {heroes}=await createOverfastService({locale:()=> 'ko-kr'}).getHeroes();report.hot=[];
for(const filters of [DEFAULT_FILTERS,{...DEFAULT_FILTERS,division:'diamond'}]){
 const current=await statistics.getStatistics(filters);
 const previous=await history.getPreviousResult(filters,current.fetchedAt,current);
 const model=createHeroModel();Object.assign(model.state,{heroes,statistics:current,statsFilters:filters});
 const trend=hotHeroes(model.enrichedHeroes(),current,previous.snapshot);
 report.hot.push({filters,currentAt:current.fetchedAt,latestAt:previous.latestAt,status:previous.reason,rejected:previous.rejected,warnings:previous.warnings,comparisonAvailable:trend.available,selected:trend.heroes.map(h=>h.key),currentStale:current.stale,error:current.error});
}
report.protectedSnapshotsUnchanged=JSON.stringify(protectedBefore)===JSON.stringify(await hashes());
if(!report.protectedSnapshotsUnchanged)throw Error('Protected snapshot files changed');
await mkdir('docs/qa/how-diagnostics',{recursive:true});await writeFile('docs/qa/how-diagnostics/operating.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedAt:report.checkedAt,latestSnapshot:report.snapshots.latestAt,ranks:report.ranks,workflowFiles:report.workflowFiles,hot:report.hot,protectedSnapshotsUnchanged:report.protectedSnapshotsUnchanged},null,2));
