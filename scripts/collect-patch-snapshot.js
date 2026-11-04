import {fileURLToPath} from 'node:url';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
import proofs from '../src/data/patchObservationProofs.json' with {type:'json'};
import {collectPatch} from './lib/patchCollector.js';
const args=process.argv.slice(2),key=args.find(arg=>!arg.startsWith('--'));
if(args.some(arg=>arg.startsWith('--')&&arg!=='--dry-run'))throw new Error('Unknown option');
const patch=PATCH_CATALOG.find(row=>row.id===key);
console.log(JSON.stringify(await collectPatch({patch,root:fileURLToPath(new URL('../public/data/snapshots/',import.meta.url)),proof:proofs[key],dryRun:args.includes('--dry-run')}),null,2));
