// Strict inventory check: no API calls, generated images, or file writes.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPngRankAssets} from '../src/data/rankAssets.js';
const assets=createPngRankAssets('/HOW/'),keys=Object.keys(assets),missing=[];
for(const key of keys){
 try{
  const bytes=await readFile(new URL(`../public/assets/ranks/${key}.png`,import.meta.url));
  if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.subarray(12,16).toString()!=='IHDR'||!bytes.readUInt32BE(16)||!bytes.readUInt32BE(20))throw new Error('Invalid PNG');
  if(bytes.readUInt32BE(16)!==assets[key].width||bytes.readUInt32BE(20)!==assets[key].height||createHash('sha256').update(bytes).digest('hex')!==assets[key].sha256)throw new Error('PNG metadata/hash mismatch');
  console.log(`${key}: ${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}, SHA256 ${createHash('sha256').update(bytes).digest('hex')}`);
 }catch(error){missing.push(key);console.error(`${key}: ${error.code==='ENOENT'?'MISSING':error.message}`);}
}
if(missing.length){console.error(`PNG inventory incomplete: ${keys.length-missing.length}/8; unresolved: ${missing.join(', ')}`);process.exitCode=1;}else console.log('PNG inventory complete: 8/8. champion.png is never a filter.');
