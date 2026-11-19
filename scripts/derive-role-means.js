import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {expandSnapshotFile,stableJSON} from '../src/models/snapshotV2Model.js';
import {statisticsQuery} from '../src/models/statisticsModel.js';
import {roleRoster,meanRoleRecords,normalizeRoleMeanArchive,ROLE_MEAN_VERSION,ROLE_MEAN_METHOD} from '../src/models/roleMeanModel.js';
export async function deriveRoleMeans({directory='public/data/snapshots',rosterFile=new URL('../src/data/subroles.json',import.meta.url),output='public/data/role-means/observations.json',apply=false}={}){
 const manifest=JSON.parse(await readFile(path.join(directory,'index.json'),'utf8'));
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.snapshots))throw Error('Invalid snapshot index');
 const rosterData=JSON.parse(await readFile(rosterFile,'utf8')),heroes=Object.entries(rosterData.heroes).map(([key,h])=>({key,role:h.parentRole}));
 if(!heroes.length||heroes.some(h=>!/^[a-z0-9-]+$/.test(h.key)||!['tank','damage','support'].includes(h.role)))throw Error('Invalid source role roster');
 const files=new Map();for(const entry of manifest.snapshots){if(!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(entry.file))throw Error('Unsafe snapshot reference');if(!files.has(entry.file)){const bytes=await readFile(path.join(directory,entry.file));files.set(entry.file,{sha256:createHash('sha256').update(bytes).digest('hex'),frames:expandSnapshotFile(JSON.parse(bytes.toString('utf8')),{includeDerived:true})});}}
 const indexed=frame=>manifest.snapshots.some(e=>e.collectedAt===frame.collectedAt&&statisticsQuery(e.filters)===statisticsQuery(frame.filters)&&(e.patch===undefined||e.patch===frame.patch));
 for(const entry of manifest.snapshots)if(!files.get(entry.file).frames.some(frame=>!frame.composite&&frame.collectedAt===entry.collectedAt&&statisticsQuery(frame.filters)===statisticsQuery(entry.filters)&&(entry.patch===undefined||entry.patch===frame.patch)))throw Error('Snapshot index/original mismatch');
 const observations=[];const seen=new Set();
 for(const [file,{sha256,frames}]of files)for(const frame of frames){
  // A grouped file already contains exactly one recomputed frame per composite cohort.
  if(!frame.composite&&!indexed(frame))continue;const key=statisticsQuery(frame.filters)+':'+frame.collectedAt;if(seen.has(key))continue;seen.add(key);
  const components=frame.composite?frame.components:[{division:frame.filters.division,collectedAt:frame.collectedAt}];
  const sources=components.map(c=>{const original=files.get(file).frames.find(f=>!f.composite&&f.filters.division===c.division&&f.collectedAt===c.collectedAt);if(!original||!indexed(original))throw Error('Composite original is not indexed');return {file,sha256,division:c.division,collectedAt:c.collectedAt};});
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(frame.collectedAt));
  const roles=meanRoleRecords(frame.records,heroes),coverage={validCount:Object.values(roles).reduce((n,r)=>n+r.count,0),targetCount:Object.values(roles).reduce((n,r)=>n+r.targetCount,0)};
  observations.push({date,collectedAt:frame.collectedAt,observationStart:frame.observationStart??frame.collectedAt,filters:frame.filters,source:frame.source,provenance:frame.provenance,patch:frame.patch??null,patchVerification:frame.patchVerification??null,statisticsWindow:frame.statisticsWindow??'unverified-patch-window',sources,roles,coverage});
 }
 observations.sort((a,b)=>a.collectedAt.localeCompare(b.collectedAt)||statisticsQuery(a.filters).localeCompare(statisticsQuery(b.filters)));
 let previous;try{previous=await readFile(output,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const sourceFingerprint=createHash('sha256').update(stableJSON({roster:roleRoster(heroes),observations})).digest('hex');
 let old;try{old=normalizeRoleMeanArchive(JSON.parse(previous));}catch{}
 const generatedAt=old?.sourceFingerprint===sourceFingerprint?old.generatedAt:new Date().toISOString();
 const archive=normalizeRoleMeanArchive({schemaVersion:1,aggregateVersion:ROLE_MEAN_VERSION,method:ROLE_MEAN_METHOD,metric:'winRate',timezone:'Asia/Seoul',roster:roleRoster(heroes),observations,generatedAt,sourceFingerprint});
 const content=stableJSON(archive)+'\n';
 const changed=content!==previous;
 if(apply&&changed){await mkdir(path.dirname(output),{recursive:true});const temporary=output+'.tmp';try{await writeFile(temporary,content,'utf8');normalizeRoleMeanArchive(JSON.parse(await readFile(temporary,'utf8')));await rename(temporary,output);}finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}}
 return {archive,changed,applied:apply&&changed,observations:observations.length,files:files.size,bytes:Buffer.byteLength(content)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await deriveRoleMeans({apply:process.argv.includes('--apply')});const {archive,...summary}=result;console.log(JSON.stringify(summary));}catch(error){console.error(error.message);process.exitCode=1;}}
