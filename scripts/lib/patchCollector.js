import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {collectionDecision} from '../../src/models/patchCollectionModel.js';
import {DEFAULT_FILTERS,statisticsQuery} from '../../src/models/statisticsModel.js';
import {normalizeSnapshot} from '../../src/models/snapshotModel.js';
import {verifiedPatch} from '../../src/models/patchHistoryModel.js';
import roster from '../../src/data/subroles.json' with {type:'json'};

export async function collectPatch({patch,root,proof=null,fetcher=globalThis.fetch,now=Date.now,dryRun=false}){
 if(!patch)throw new Error('Unknown patch');
 await mkdir(root,{recursive:true});
 const indexPath=join(root,'index.json'),lockPath=join(root,'patch-collector.lock');
 const lock=await open(lockPath,'wx');
 let pending,fileWritten;
 try{
  let index;try{index=JSON.parse(await readFile(indexPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;index={schemaVersion:1,snapshots:[]};}
  if(index.schemaVersion!==1||!Array.isArray(index.snapshots))throw new Error('Invalid index');
  const seen=new Set();
  for(const entry of index.snapshots){
    if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file)||seen.has(entry.file))throw new Error('Invalid or duplicate indexed file');
    seen.add(entry.file);
    const existing=normalizeSnapshot(JSON.parse(await readFile(join(root,entry.file),'utf8')));
    if(existing.collectedAt!==entry.collectedAt||statisticsQuery(existing.filters)!==statisticsQuery(entry.filters)||entry.patch!==undefined&&entry.patch!==existing.patch)throw new Error('Index/file mismatch');
  }
  const decision=collectionDecision(patch,index.snapshots,DEFAULT_FILTERS,statisticsQuery,now());
  if(!decision.collect||dryRun)return {...decision,dryRun};
  const endpoint=`https://overfast-api.tekrop.fr/heroes/stats?${statisticsQuery(DEFAULT_FILTERS)}`;
  const response=await fetcher(endpoint,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(`Patch statistics request failed (${response.status})`);
  const collectedAt=new Date(now()).toISOString();
  const candidate={schemaVersion:1,source:'OverFast API',endpoint,filters:{...DEFAULT_FILTERS},collectedAt,aggregateAt:null,patch:patch.id,patchVerification:proof,records:await response.json()};
  const records=normalizeSnapshot(candidate).records;
  if(records.length!==54||Object.keys(roster.heroes).some(key=>!records.some(r=>r.hero===key)))throw new Error('Expected all 54 current heroes');
  const confirmed=proof?.upstreamPatchId===patch.officialId&&typeof proof?.evidenceUrl==='string'&&proof.evidenceUrl.startsWith('https://')&&verifiedPatch(candidate,[patch]);
  const snapshot={...candidate,patch:confirmed?patch.id:null,targetPatch:patch.id,patchVerification:confirmed?proof:{status:'unverified',reason:'upstream-patch-window-unconfirmed'},representativeKind:confirmed?'first-confirmed-after-day-one':null,statisticsWindow:confirmed?'since-patch-start':'unverified-patch-window',cacheAgeSeconds:response.headers?.get('age')??null};
  const file=collectedAt.replaceAll(':','-')+'.json';
  const filePath=join(root,file);await writeFile(filePath,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});fileWritten=filePath;
  index.snapshots.push({file,collectedAt,filters:{...DEFAULT_FILTERS},patch:snapshot.patch,targetPatch:patch.id,representativeKind:snapshot.representativeKind});
  pending=join(root,`index.${process.pid}.pending`);await writeFile(pending,JSON.stringify(index,null,2)+'\n',{flag:'wx'});await rename(pending,indexPath);pending=null;fileWritten=null;
  return {saved:true,file,verified:Boolean(confirmed),representativeKind:snapshot.representativeKind};
 }finally{
  if(pending)await unlink(pending).catch(()=>{});
  if(fileWritten)await unlink(fileWritten).catch(()=>{});
  await lock.close();await unlink(lockPath);
 }
}
