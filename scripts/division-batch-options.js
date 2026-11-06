import {REGIONS} from '../src/models/statisticsModel.js';
export function parseDivisionBatchOptions(args){
 let region='asia',apply=false,retryOf=null;const seen=new Set();
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(seen.has(flag))throw new Error('Duplicate batch option');seen.add(flag);
  if(flag==='--apply'){apply=true;continue;}
  if(!['--region','--retry-of'].includes(flag)||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Invalid batch option');
  const value=args[++i];if(flag==='--region')region=value;else retryOf=value;
 }
 if(!Object.hasOwn(REGIONS,region)||retryOf&&!/^\d{4}-\d{2}-\d{2}T[\dZ.-]+\.json$/.test(retryOf))throw new Error('Invalid region or recovery file');
 return {region,apply,retryOf};
}
