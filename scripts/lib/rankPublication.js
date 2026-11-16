import {createHash} from 'node:crypto';
import {restorePublishedRanks} from './rankFiles.js';

export const rankDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function confirmRankPublication({expected,url,runId,attempts=12,delay=()=>new Promise(resolve=>setTimeout(resolve,5000)),restore=restorePublishedRanks}){
 let lastError;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const source=new URL(url);source.searchParams.set('publication',`${runId}-${attempt}`);
   const actual=await restore(source);
   if(rankDigest(actual)!==rankDigest(expected))throw Error('Published rank file differs from deployed candidate');
   return {publishedAt:new Date().toISOString(),runId,rankDigest:rankDigest(actual),cohorts:actual.cohorts.length};
  }catch(error){lastError=error;if(attempt<attempts-1)await delay();}
 }
 throw lastError;
}
