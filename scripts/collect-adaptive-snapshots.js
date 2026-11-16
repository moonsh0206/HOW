// Existing batch collector with append-only persistence; no Git/Pages side effects.
import {readFile,open,unlink,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {createOverfastService} from '../src/services/heroService.js';
import {collectGraphObservations} from './lib/graphCollection.js';
import roster from '../src/data/subroles.json' with {type:'json'};
const args=process.argv.slice(2),apply=args.at(-1)==='--apply';
if(args.length!==(apply?2:1)||args[0].startsWith('--'))throw Error('Usage: collect-adaptive-snapshots.js <local-plan.json> [--apply]');
const plan=JSON.parse(await readFile(args[0],'utf8'));
const patch=plan.patchId?PATCH_CATALOG.find(p=>p.id===plan.patchId):null;
if(plan.patchId&&!patch)throw Error('Unknown reviewed patch ID');
const root=fileURLToPath(new URL('../public/data/snapshots/',import.meta.url));
async function run(){
 const result=await collectGraphObservations({root,ledgerPath:fileURLToPath(new URL('../node_modules/.cache/how-adaptive-attempts.json',import.meta.url)),plan,patch,heroKeys:Object.keys(roster.heroes),heroesService:createOverfastService({locale:()=> 'ko-kr'}),service:apply?createStatisticsService():null,now:()=>plan.now?Date.parse(plan.now):Date.now(),dryRun:!apply});
 if(apply){await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/graph-collection.json',JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify(result,null,2));if(result.failures)process.exitCode=1;
}
if(!apply)await run();else{
 const path=new URL('../public/data/snapshots/snapshot-collector.lock',import.meta.url),lock=await open(path,'wx');
 try{await run();}catch(error){await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/graph-collection.json',JSON.stringify({status:'failed',error:error.message})+'\n');throw error;}
 finally{await lock.close();await unlink(path);}
}
