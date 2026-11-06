// Offline planner only. Collection remains an explicit manual operation.
import {readFile} from 'node:fs/promises';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
import {collectAdaptiveRegions} from './lib/adaptiveBatch.js';
const args=process.argv.slice(2);
if(args.length!==1||args[0].startsWith('--'))throw new Error('Usage: node scripts/plan-adaptive-snapshots.js <local-plan.json> (no API or writes)');
const plan=JSON.parse(await readFile(args[0],'utf8'));
const patch=PATCH_CATALOG.find(p=>p.id===plan.patchId);
const result=await collectAdaptiveRegions({patch,regions:plan.regions,observations:plan.observations??[],attempts:plan.attempts??[],extraRequested:plan.extraRequested===true,now:()=>plan.now?Date.parse(plan.now):Date.now()});
console.log(JSON.stringify(result,null,2));
