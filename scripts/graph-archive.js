// Remote writes are only available to the explicitly enabled future Actions job.
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {createGraphRepository,readGraphBundle,installGraphBundle,verifyGraphPublication} from './lib/graphArchive.js';
const mode=process.argv[2],bootstrap=process.argv.includes('--bootstrap');
if(!['restore','persist','verify-public','publication-needed'].includes(mode))throw Error('Usage: graph-archive.js restore [--bootstrap] | persist --apply | verify-public | publication-needed');
const root='public/data/snapshots',repository=createGraphRepository({repo:process.env.GITHUB_REPOSITORY??'moonsh0206/HOW',token:process.env.GH_TOKEN});
if(mode==='restore'){
 const remote=await repository.read({bootstrap});await installGraphBundle(root,remote.bundle);
 await mkdir('node_modules/.cache',{recursive:true});await writeFile('node_modules/.cache/how-adaptive-attempts.json',JSON.stringify(remote.attempts));
 console.log(`Restored ${remote.bundle.files.size} durable graph files; existing observations preserved.`);
}else if(mode==='persist'){
 if(!process.argv.includes('--apply')||process.env.HOW_GRAPH_ARCHIVE_ENABLED!=='true'||process.env.GITHUB_ACTIONS!=='true')throw Error('Graph remote persistence requires enabled Actions and --apply');
 const previous=await repository.read({bootstrap}),bundle=await readGraphBundle(root);
 const attempts=JSON.parse(await readFile('node_modules/.cache/how-adaptive-attempts.json','utf8'));
 console.log(`Durable graph commit: ${await repository.persist(previous,bundle,attempts)}`);
}else if(mode==='publication-needed'){
 const base=new URL(process.env.HOW_GRAPH_PUBLIC_URL);if(base.protocol!=='https:'||!base.pathname.endsWith('/'))throw Error('HTTPS graph directory URL ending in / required');
 const expected=await readGraphBundle(root);let needed=true;
 try{await verifyGraphPublication({base,expected,attempts:1});needed=false;}catch(error){console.log(`Publication needed: ${error.message}`);}
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`needed=${needed}\n`);
 console.log(`Graph publication needed: ${needed}`);
}else{
 const expected=await readGraphBundle('dist/data/snapshots');
 await verifyGraphPublication({base:process.env.HOW_GRAPH_PUBLIC_URL,expected});
 console.log(`Confirmed ${expected.files.size} graph files via public HTTP.`);
}
