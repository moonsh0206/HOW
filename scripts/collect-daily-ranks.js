// Rates exist in memory and are never written as daily snapshots.
import {readFile,mkdir,open,unlink} from 'node:fs/promises';
import {restorePublishedRanks,writeRankArchive} from './lib/rankFiles.js';
import {createStatisticsService} from '../src/services/statisticsService.js';
import {createOverfastService} from '../src/services/heroService.js';
import {validateRankArchive} from '../src/models/rankArchiveModel.js';
import {collectDailyRanks} from './lib/dailyRanks.js';
const args=process.argv.slice(2),file=new URL('../public/data/ranks/current.json',import.meta.url);
if(!args.includes('--apply')){console.log('Dry-run: no requests or writes. Use --apply; optionally --restore-url HTTPS_URL.');}else{
 await mkdir(new URL('../public/data/ranks/',import.meta.url),{recursive:true});
 const lockFile=new URL('collector.lock',file),lock=await open(lockFile,'wx');
 try {
 let previous=validateRankArchive(JSON.parse(await readFile(file,'utf8')));
 const at=args.indexOf('--restore-url');
 if(at>=0)previous=await restorePublishedRanks(args[at+1]);
 let archive=previous;
 if(!args.includes('--restore-only')){const {heroes}=await createOverfastService({locale:()=> 'ko-kr'}).getHeroes();const result=await collectDailyRanks({service:createStatisticsService(),heroes,previous});console.log(JSON.stringify({requests:result.requests,updated:result.updated,failures:result.failures}));if(!result.updated&&result.failures.length)throw Error('No successful update; existing archive preserved');archive=result.updated?result.archive:previous;}
 if(JSON.stringify(archive)!==JSON.stringify(JSON.parse(await readFile(file,'utf8'))))await writeRankArchive(file,archive);
 }finally{await lock.close();await unlink(lockFile);}
}
