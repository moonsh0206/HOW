import {readFile,writeFile,mkdir,rename,unlink,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {expandSnapshotFile,stableJSON} from '../../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../../src/models/statisticsModel.js';
import {isObservationTime} from '../../src/models/snapshotModel.js';
export const GRAPH_BRANCH='how-graph-archive';
const safe=name=>/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(name);
const identity=e=>`${e.file}:${statisticsQuery(e.filters)}:${e.collectedAt}`;
export function mergeGraphAttempts(...groups){
 const rows=new Map();for(const attempt of groups.flat()){
  if(!['asia','europe','americas'].includes(attempt.region)||!isObservationTime(attempt.at)||attempt.retryAt!==undefined&&!isObservationTime(attempt.retryAt))throw Error('Invalid graph attempt');
  const key=`${attempt.region}:${attempt.at}:${attempt.targetPatch??''}`,old=rows.get(key),row={...old,...attempt};
  const retryAt=[old?.retryAt,attempt.retryAt].filter(Boolean).sort().at(-1);if(retryAt)row.retryAt=retryAt;
  rows.set(key,row);
 }return [...rows.values()];
}
export function validateGraphBundle(bundle){
 if(![1,2].includes(bundle.index?.schemaVersion)||!Array.isArray(bundle.index.snapshots))throw Error('Invalid graph index');
 const rows=new Map(),seen=new Set();
 for(const entry of bundle.index.snapshots){
  if(!safe(entry.file)||!bundle.files.has(entry.file)||!['platform','gamemode','region','division','map'].every(k=>typeof entry.filters?.[k]==='string')||seen.has(identity(entry)))throw Error('Unsafe, missing or duplicate graph entry');
  seen.add(identity(entry));
  if(!rows.has(entry.file))rows.set(entry.file,expandSnapshotFile(JSON.parse(bundle.files.get(entry.file))));
  if(!rows.get(entry.file).some(s=>s.collectedAt===entry.collectedAt&&statisticsQuery(s.filters)===statisticsQuery(entry.filters)&&(entry.patch===undefined||entry.patch===s.patch)))throw Error('Graph index/file mismatch');
 }
 for(const [file,records] of rows)for(const s of records)if(!seen.has(identity({file,...s})))throw Error('Unindexed original observation');
 if(bundle.files.size!==rows.size)throw Error('Unexpected graph file');
 return bundle;
}
export async function verifyGraphPublication({base,expected,fetcher=fetch,attempts=12,delay=()=>new Promise(resolve=>setTimeout(resolve,5000))}){
 const url=new URL(base);if(url.protocol!=='https:'||!url.pathname.endsWith('/'))throw Error('HTTPS graph directory URL ending in / required');validateGraphBundle(expected);
 let failure;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const response=await fetcher(new URL(`index.json?verify=${Date.now()}-${attempt}`,url),{cache:'no-cache',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error(`Public graph index HTTP ${response.status}`);
   if(stableJSON(await response.json())!==stableJSON(expected.index))throw Error('Public graph index differs from built candidate');
   for(const [file,bytes] of expected.files){const response=await fetcher(new URL(file,url),{cache:'no-cache',signal:AbortSignal.timeout(20000)});if(!response.ok||await response.text()!==bytes)throw Error(`Public graph file differs: ${file}`);}
   return {files:expected.files.size};
  }catch(error){failure=error;if(attempt<attempts-1)await delay();}
 }
 throw failure;
}
export async function readGraphBundle(root){
 const index=JSON.parse(await readFile(join(root,'index.json'),'utf8')),files=new Map();
 for(const entry of index.snapshots){if(!safe(entry.file))throw Error('Unsafe graph filename');if(!files.has(entry.file))files.set(entry.file,await readFile(join(root,entry.file),'utf8'));}
 for(const file of await readdir(root))if(file.endsWith('.json')&&file!=='index.json'&&!files.has(file))throw Error(`Unindexed graph file: ${file}`);
 return validateGraphBundle({index,files});
}
export function mergeGraphBundles(a,b){
 validateGraphBundle(a);validateGraphBundle(b);const files=new Map(a.files),entries=new Map(a.index.snapshots.map(e=>[identity(e),e]));
 for(const [name,bytes] of b.files){if(files.has(name)&&files.get(name)!==bytes)throw Error(`Immutable graph file conflict: ${name}`);files.set(name,bytes);}
 for(const entry of b.index.snapshots){const old=entries.get(identity(entry));if(old&&stableJSON(old)!==stableJSON(entry))throw Error('Graph metadata conflict');entries.set(identity(entry),entry);}
 return validateGraphBundle({index:{...a.index,snapshots:[...entries.values()]},files});
}
export async function installGraphBundle(root,bundle){
 const merged=mergeGraphBundles(await readGraphBundle(root),bundle),owned=[],pending=join(root,`index.${process.pid}.pending`);
 try{
  for(const [name,bytes] of merged.files){const path=join(root,name);try{const existing=await readFile(path,'utf8');if(existing!==bytes)throw Error('Immutable graph conflict');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(path,bytes,{flag:'wx'});owned.push(path);}}
  await writeFile(pending,JSON.stringify(merged.index,null,2)+'\n',{flag:'wx'});await rename(pending,join(root,'index.json'));return merged;
 }catch(error){for(const path of owned)await unlink(path);await unlink(pending).catch(e=>{if(e.code!=='ENOENT')throw e;});throw error;}
}
export function createGraphRepository({repo,token,fetcher=fetch}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error('Invalid repository');
 const headers={Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`}:{})};
 async function api(path,body,method=body?'POST':'GET'){
  const response=await fetcher(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{...headers,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){const error=Error(`Graph repository ${method} ${path}: HTTP ${response.status}`);error.status=response.status;throw error;}return response.json();
 }
 async function raw(sha,file){const response=await fetcher(`https://raw.githubusercontent.com/${repo}/${sha}/${file}`,{headers,cache:'no-cache',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Graph archive file HTTP ${response.status}`);return response.text();}
 return {
  async read({bootstrap=false}={}){
   let ref;try{ref=await api(`git/ref/heads/${GRAPH_BRANCH}`);}catch(error){if(error.status===404&&bootstrap)return {sha:null,bundle:{index:{schemaVersion:1,snapshots:[]},files:new Map()},attempts:[]};throw error;}
   const sha=ref.object.sha,index=JSON.parse(await raw(sha,'index.json')),files=new Map();
   for(const entry of index.snapshots){if(!safe(entry.file))throw Error('Unsafe remote graph filename');if(!files.has(entry.file))files.set(entry.file,await raw(sha,entry.file));}
   const attempts=JSON.parse(await raw(sha,'attempts.json'));if(!Array.isArray(attempts))throw Error('Invalid graph attempts');
   const commit=await api(`git/commits/${sha}`);
   return {sha,treeSha:commit.tree.sha,bundle:validateGraphBundle({index,files}),attempts:mergeGraphAttempts(attempts)};
  },
  async persist(previous,bundle,attempts){
   if(!token)throw Error('Graph archive write token required');
   const merged=mergeGraphBundles(previous.bundle,bundle),tree=[];
   const ledger=mergeGraphAttempts(previous.attempts??[],attempts);
   if(previous.sha&&stableJSON(merged.index)===stableJSON(previous.bundle.index)&&merged.files.size===previous.bundle.files.size&&stableJSON(ledger)===stableJSON(previous.attempts))return previous.sha;
   // Reuse the preceding Git tree: long-lived archives upload only new blobs.
   const files=new Map([...merged.files].filter(([name])=>!previous.bundle.files.has(name)));
   if(!previous.sha||stableJSON(merged.index)!==stableJSON(previous.bundle.index))files.set('index.json',JSON.stringify(merged.index,null,2)+'\n');
   if(!previous.sha||stableJSON(ledger)!==stableJSON(previous.attempts))files.set('attempts.json',JSON.stringify(ledger)+'\n');
   for(const [path,content] of files){const blob=await api('git/blobs',{content,encoding:'utf-8'});tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
   const result=await api('git/trees',{...(previous.sha?{base_tree:previous.treeSha}:{}),tree});
   const commit=await api('git/commits',{message:'Preserve validated graph observations',tree:result.sha,parents:previous.sha?[previous.sha]:[]});
   // Never force: a competing archive publication must reject this stale parent.
   if(previous.sha)await api(`git/refs/heads/${GRAPH_BRANCH}`,{sha:commit.sha,force:false},'PATCH');
   else await api('git/refs',{ref:`refs/heads/${GRAPH_BRANCH}`,sha:commit.sha});
   return commit.sha;
  },
 };
}
