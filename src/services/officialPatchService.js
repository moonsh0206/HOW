import {normalizeOfficialPatches} from '../models/officialPatchModel.js';
export function createOfficialPatchService({base='/',fetcher=globalThis.fetch}={}){if(typeof base!=='string'||!base.startsWith('/')||base.startsWith('//')||!base.endsWith('/')||base.includes('..'))throw new Error('공식 패치 BASE_URL 오류');let pending;return {getNotes(){
 if(!pending)pending=(async()=>{const r=await fetcher(`${base}data/patches/notes.json`,{signal:AbortSignal.timeout(12000),cache:'no-cache',credentials:'same-origin'});if(!r.ok)throw new Error(`공식 패치 자료 연결 실패 (${r.status})`);return normalizeOfficialPatches(await r.json());})().catch(e=>{pending=null;throw e;});return pending;
}};}
