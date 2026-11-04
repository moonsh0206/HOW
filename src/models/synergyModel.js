import roles from '../data/subroles.json' with {type:'json'};
export function normalizeSynergies(rows) {
 if(!Array.isArray(rows))throw new Error('Invalid synergy data');
 const seen=new Set(),counts=new Map();
 return rows.map(row=>{
  const a=roles.heroes[row.heroKey],b=roles.heroes[row.allyHeroKey],key=`${row.heroKey}:${row.allyHeroKey}`;
  if(!a||!b||row.heroKey===row.allyHeroKey||a.parentRole==='tank'&&b.parentRole==='tank'||seen.has(key)||typeof row.reason!=='string'||!row.reason.trim()||row.mode!=='5v5-role-queue'||row.sourceType!=='manual-kit-review'||!/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedAt)||!Array.isArray(row.sourceUrls)||row.sourceUrls.length<2||row.sourceUrls.some(value=>{try{const u=new URL(value);return u.protocol!=='https:'||u.hostname!=='overwatch.blizzard.com';}catch{return true;}}))throw new Error('Invalid synergy relation');
  seen.add(key);counts.set(row.heroKey,(counts.get(row.heroKey)??0)+1);if(counts.get(row.heroKey)>3)throw new Error('Too many allies');
  if(!['ability','tactical'].includes(row.synergyType))throw new Error('Invalid synergy type');
  return {...row};
 });
}
