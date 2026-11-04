import {statisticsQuery} from './statisticsModel.js';
export function dailyCollectionDecision(entries,filters,now,eventId=null){
 const same=entries.filter(entry=>statisticsQuery(entry.filters)===statisticsQuery(filters));
 if(eventId)return same.some(entry=>entry.observationEvent===eventId)?{collect:false,reason:'event-already-observed'}:{collect:true,reason:'explicit-event-observation'};
 const latest=Math.max(-Infinity,...same.map(e=>Date.parse(e.collectedAt)));
 return now-latest<86400000?{collect:false,reason:'daily-limit'}:{collect:true,reason:'daily-observation'};
}
