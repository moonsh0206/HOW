export const RATE_FIELDS=Object.freeze(['winRate','pickRate','banRate']);
// Zero remains a number. Review is a distinct state, never a claim of missing data.
export function rateStatus(record,field){
 const explicit=record?.quality?.fields?.[field];
 if(explicit==='confirmed-missing'||explicit==='review')return explicit;
 const value=record?.[field];
 if(!Number.isFinite(value)||value<0||value>100)return 'missing';
 if(field==='winRate'&&value===0&&Number.isFinite(record.pickRate)&&explicit!=='verified')return 'review';
 return 'available';
}
export function statisticsUsable(record){return RATE_FIELDS.every(field=>rateStatus(record,field)==='available');}
export function statisticsNeedsReview(record){return RATE_FIELDS.some(field=>rateStatus(record,field)==='review');}
export function qualitySummary(records){return {total:records.length,review:records.filter(statisticsNeedsReview).length,missing:records.filter(r=>RATE_FIELDS.some(f=>['missing','confirmed-missing'].includes(rateStatus(r,f)))).length,confirmedMissing:records.filter(r=>RATE_FIELDS.some(f=>rateStatus(r,f)==='confirmed-missing')).length};}
