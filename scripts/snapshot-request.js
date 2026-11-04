import {parseSnapshotFilters} from './snapshot-options.js';
import {PATCH_CATALOG} from '../src/data/patchCatalog.js';
export function parseSnapshotRequest(args){
 const flags=[];let eventId=null;
 for(let i=0;i<args.length;i+=2){if(args[i]==='--event'){if(eventId||!PATCH_CATALOG.some(p=>p.id===args[i+1]))throw new Error('Unknown or duplicate observation event');eventId=args[i+1];}else flags.push(args[i],args[i+1]);}
 return {filters:parseSnapshotFilters(flags),eventId};
}
