import {writeFile,rename,unlink} from 'node:fs/promises';
import {validateRankArchive} from '../../src/models/rankArchiveModel.js';
export async function restorePublishedRanks(url,{fetcher=fetch}={}){
 const source=new URL(url);if(source.protocol!=='https:')throw Error('HTTPS published baseline required');
 const response=await fetcher(source,{signal:AbortSignal.timeout(20000),cache:'no-cache'});
 if(!response.ok)throw Error(`Published baseline unavailable (${response.status})`);
 return validateRankArchive(await response.json());
}
export async function writeRankArchive(file,archive,{replace=rename}={}){
 validateRankArchive(archive);const temp=new URL(`current.${process.pid}.pending`,file);
 await writeFile(temp,JSON.stringify(archive)+'\n',{flag:'wx'});
 try{await replace(temp,file);}finally{await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
