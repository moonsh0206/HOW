let sequence=0;
const starts=new Map();
export function mapPerformanceStart(){const id=`how.heroMaps.${++sequence}`;mapPerformanceMark(id,'start');starts.set(id,globalThis.performance?.now?.()??0);if(starts.size>256)starts.delete(starts.keys().next().value);return id;}
export function mapPerformanceMark(id,stage,detail){try{globalThis.performance?.mark?.(`${id}.${stage}`,{detail});}catch{}}
export function mapPerformanceEnd(id,stage,detail){
 const p=globalThis.performance;if(!p?.measure||!starts.has(id))return;
 try{mapPerformanceMark(id,stage,detail);p.measure(`${id}.${stage}`,{start:starts.get(id),end:p.now(),detail:{trace:id,...detail}});const entries=p.getEntriesByType('measure').filter(e=>e.name.startsWith('how.heroMaps.'));if(entries.length>1024)p.clearMeasures(entries[0].name);p.getEntriesByType('mark').filter(e=>e.name.startsWith(id+'.')).forEach(e=>p.clearMarks(e.name));}catch{}
}
