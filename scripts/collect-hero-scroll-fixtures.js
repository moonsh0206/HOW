// QA metadata only. Does not write production statistics, snapshots or app data.
import * as fs from 'node:fs/promises';
import {normalizeHeroDetail} from '../src/models/heroDetailModel.js';
const root='docs/qa/hero-scroll-audit/data',rosterUrl='https://overfast-api.tekrop.fr/heroes?locale=ko-kr';
await fs.mkdir(root,{recursive:true});
const response=await fetch(rosterUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Roster HTTP ${response.status}`);
const heroes=await response.json();if(!Array.isArray(heroes)||!heroes.length||heroes.some(h=>!/^[-a-z0-9]+$/.test(h.key))||new Set(heroes.map(h=>h.key)).size!==heroes.length)throw Error('Invalid actual roster');
await fs.writeFile(root+'/heroes.json',JSON.stringify(heroes));
const results=[];let index=0;
async function worker(){while(index<heroes.length){const hero=heroes[index++],source=`https://overfast-api.tekrop.fr/heroes/${hero.key}?locale=ko-kr`;
 try{const r=await fetch(source,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const raw=await r.json();normalizeHeroDetail(raw,hero.key);await fs.writeFile(`${root}/${hero.key}.json`,JSON.stringify(raw));results.push({heroKey:hero.key,source,status:r.status,collectedAt:new Date().toISOString()});}
 catch(error){results.push({heroKey:hero.key,source,error:error.message});}
}}
await Promise.all([worker(),worker()]);await fs.writeFile(root+'/collection.json',JSON.stringify({rosterUrl,heroes:heroes.length,results},null,2));
console.log({heroes:heroes.length,successful:results.filter(r=>r.status===200).length,failures:results.filter(r=>r.error)});if(results.some(r=>r.error))process.exitCode=1;
