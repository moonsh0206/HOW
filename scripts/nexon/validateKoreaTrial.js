export function validateKoreaTrial(trial,roster){
 const source=new URL(trial.source),expected={role:'all',rq:'2',rank:'diamond',map:'all',input:'pc',region:'korea'};
 if(source.origin!=='https://overwatch.nexon.com'||source.pathname!=='/hero/rate'||Object.entries(expected).some(([k,v])=>source.searchParams.get(k)!==v||trial.requested?.[k]!==v))throw new Error('Trial filter mismatch');
 if(!Number.isFinite(Date.parse(trial.collectedAt))||trial.sourceUpdatedAt!==null)throw new Error('Unverified observation metadata');
 if(trial.statistics?.status!=='success'||trial.filters?.status!=='success')throw new Error('Source failed');
 const options=trial.filters.data;
 for(const [field,key]of [['roles','role'],['rulesetQueues','rq'],['ranks','rank'],['maps','map'],['inputs','input'],['regions','region']])if(!options[field]?.some(o=>o.value===expected[key]))throw new Error('Filter unsupported');
 for(const label of ['경쟁전 - 역할 고정','다이아몬드','모든 전장','PC','한국'])if(!trial.dom?.filters?.split('\n').includes(label))throw new Error('Rendered filter mismatch');
 const records=trial.statistics.data?.list;if(!Array.isArray(records)||!records.length)throw new Error('Empty statistics');
 const known=new Map(roster.map(h=>[h.key,h])),seen=new Set(),checks=[],normalized=[];
 for(const row of records){
  if(typeof row.heroId!=='string'||seen.has(row.heroId))throw new Error('Duplicate or missing hero');seen.add(row.heroId);
  const hero=known.get(row.heroId);if(!hero||hero.role!==row.role)throw new Error('Unmapped hero or role: '+row.heroId);
  const rates={};for(const field of ['winRate','pickRate','banRate']){const value=row[field];if(value!=null&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100))throw new Error('Invalid percentage: '+row.heroId+'/'+field);rates[field]=value??null;}
  const matches=trial.dom.rows.filter(r=>r.text.split('\n')[0]===row.name.toUpperCase()||r.text.split('\n')[0]===row.name);
  // DOM names may be transformed to uppercase by CSS (D.Va / D.Mon).
  if(matches.length!==1)throw new Error('Rendered hero missing or ambiguous: '+row.heroId);
  const displayed=matches[0].text.split('\n').slice(1);
  for(const [index,field]of ['pickRate','winRate','banRate'].entries()){const formatted=rates[field]==null?'-':rates[field].toFixed(1)+'%';if(displayed[index]!==formatted)throw new Error('Rendered value mismatch: '+row.heroId+'/'+field);}
  checks.push({heroKey:hero.key,role:row.role,...rates,displayed});
  normalized.push({heroKey:hero.key,role:row.role,...rates});
 }
 const missing=roster.filter(h=>!seen.has(h.key)).map(h=>h.key);
 if(missing.length)throw new Error('Incomplete roster: '+missing.join(','));
 return {schemaVersion:1,source:trial.source,region:'kr',provider:'nexon-korea',platform:'pc',gameMode:'competitive-role-queue',division:'diamond',map:'all',collectedAt:trial.collectedAt,sourceUpdatedAt:null,records:normalized,verification:{matched:checks.length,missing,checks}};
}
