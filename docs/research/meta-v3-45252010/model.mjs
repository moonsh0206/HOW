// Research only. Nothing in src imports this module.
import {percentile,sEligibility} from '../../../src/domain/meta.js';
import {roleTier} from '../../../src/domain/tier.js';
export const MODELS=Object.freeze([
 {id:'A',weights:[.65,.25,.10],win:'percentile'},
 {id:'A_raw5',weights:[.65,.25,.10],win:'raw',slope:5},
 {id:'A_raw10',weights:[.65,.25,.10],win:'raw',slope:10},
 {id:'B20',weights:[.45/.9,.25/.9,.20/.9],win:'percentile'},
 {id:'B15',weights:[.45/.9,.30/.9,.15/.9],win:'percentile'},
 {id:'B20_raw5',weights:[.45/.9,.25/.9,.20/.9],win:'raw',slope:5},
 {id:'B20_raw10',weights:[.45/.9,.25/.9,.20/.9],win:'raw',slope:10},
 {id:'B15_raw5',weights:[.45/.9,.30/.9,.15/.9],win:'raw',slope:5},
 {id:'B15_raw10',weights:[.45/.9,.30/.9,.15/.9],win:'raw',slope:10},
 {id:'C20',weights:[.45,.25,.20,.10],win:'percentile',full:true},
 {id:'C15',weights:[.45,.30,.15,.10],win:'percentile',full:true},
]);
const fields=['winRate','pickRate','banRate'];
const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
export const rawWinScore=(winRate,slope)=>valid(winRate)&&Number.isFinite(slope)&&slope>0?Math.max(0,Math.min(100,50+slope*(winRate-50))):null;
const cohortKeys=['platform','region','division','gamemode','map','patch'];
function sameCohort(a,b){return cohortKeys.every(key=>typeof a?.[key]==='string'&&a[key]&&a[key]===b?.[key]);}
export const ROLE_METRICS=Object.freeze({
 damage:['finalBlowsPer10','eliminationsPerLife','deathsPer10'],
 tank:['eliminationParticipationPer10','deathsPer10','damageMitigatedPer10'],
 support:['assistsPer10','healingPer10','savesPer10','deathsPer10'],
});
// No default role weights or proxy values. Requires explicit provenance and complete role coverage.
export function roleContributions(heroes,rateContext,performance,roleWeights){
 const scores=new Map(),reasons=[];
 const unavailable=reason=>({status:'unavailable',scores,reasons:[reason],cohort:null});
 if(!performance)return unavailable('No aggregate combat-contribution dataset');
 if(rateContext?.patchVerified!==true||performance.patchVerified!==true||!sameCohort(rateContext,performance.cohort))return unavailable('Patch/cohort not verified and identical');
 if(performance.population!=='hero-aggregate'||performance.permission!=='granted')return unavailable('Aggregate population/reuse permission not verified');
 try{if(new URL(performance.sourceUrl).protocol!=='https:')throw Error();}catch{return unavailable('Invalid source');}
 if(!Array.isArray(performance.rows)||new Set(performance.rows.map(r=>r.hero)).size!==performance.rows.length||performance.rows.some(r=>!heroes.some(h=>h.key===r.hero)))return unavailable('Invalid hero keys or duplicate rows');
 for(const role of ['tank','damage','support']){
  const group=heroes.filter(h=>h.role===role),weights=roleWeights?.[role];
  if(!group.length)continue;
  const entries=Object.entries(weights??{});
  if(!entries.length||entries.some(([key,w])=>!ROLE_METRICS[role].includes(key)||!Number.isFinite(w)||w<0)||Math.abs(entries.reduce((s,[,w])=>s+w,0)-1)>1e-9){reasons.push(`${role}: explicit candidate weights required`);continue;}
  const definitions=entries.map(([key])=>performance.definitions?.[key]);
  if(definitions.some((d,i)=>!d?.definitionId||d.unit!==(entries[i][0]==='eliminationsPerLife'?'per-life':'per-10-minutes')||d.comparableWithinRole!==true||d.direction!==(entries[i][0]==='deathsPer10'?'lower':'higher'))){reasons.push(`${role}: comparable metric definitions required`);continue;}
  const rows=group.map(h=>performance.rows.find(r=>r.hero===h.key));
  if(rows.some(r=>!r||entries.some(([key])=>!Number.isFinite(r[key])||r[key]<0))){reasons.push(`${role}: incomplete role coverage`);continue;}
  group.forEach((hero,index)=>{
   const score=entries.reduce((sum,[key,w],i)=>{const q=percentile(rows[index][key],rows.map(r=>r[key]));return sum+w*(definitions[i].direction==='lower'?100-q:q);},0);
   scores.set(hero.key,score);
  });
 }
 return {status:scores.size===heroes.length?'verified':scores.size?'partial':'unavailable',scores,reasons,cohort:performance.cohort};
}
export function evaluate(heroes,records,model,{rateContext,performance,roleWeights}={}){
 if(Math.abs(model.weights.reduce((a,b)=>a+b,0)-1)>1e-9||model.weights.some(w=>!Number.isFinite(w)||w<0))throw new Error('Invalid weights');
 if(new Set(records.map(r=>r.hero)).size!==records.length)throw new Error('Duplicate statistics');
 const contribution=model.full?roleContributions(heroes,rateContext,performance,roleWeights):null;
 const output=heroes.map(hero=>({...hero,statistics:records.find(r=>r.hero===hero.key),score:null,rank:null,tier:null,provisionalTier:null,capped:false,R:null,reason:model.full?'R unavailable':null}));
 for(const role of ['tank','damage','support']){
  const group=output.filter(h=>h.role===role&&fields.every(f=>valid(h.statistics?.[f])));
  if(model.full&&group.some(h=>!contribution.scores.has(h.key)))continue;
  const totalPick=group.reduce((sum,h)=>sum+h.statistics.pickRate,0);
  for(const h of group){
   [h.winPercentile,h.pickPercentile,h.banPercentile]=fields.map(f=>percentile(h.statistics[f],group.map(p=>p.statistics[f])));
   h.W=model.win==='raw'?rawWinScore(h.statistics.winRate,model.slope):h.winPercentile;
   h.P=h.pickPercentile;h.B=h.banPercentile;h.R=model.full?contribution.scores.get(h.key):null;
   h.parts=[model.weights[0]*h.W,model.weights[1]*h.P,model.weights[2]*h.B,...(model.full?[model.weights[3]*h.R]:[])];
   h.score=Number(h.parts.reduce((a,b)=>a+b,0).toFixed(10));
   h.eligibility=sEligibility(h,group.length);h.usageRatio=totalPick?group.length*h.statistics.pickRate/totalPick:null;h.reason=null;
  }
  group.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key,'en'));
  let rank=0;
  group.forEach((h,index)=>{if(!index||h.score!==group[index-1].score)rank=index+1;h.rank=rank;h.provisionalTier=roleTier(rank,group.length);h.capped=h.provisionalTier==='S'&&h.eligibility.some(rule=>!rule.passed);h.tier=h.capped?'A':h.provisionalTier;});
 }
 return output;
}
export function pearson(a,b){
 if(a.length!==b.length||a.length<2||a.some(x=>!Number.isFinite(x))||b.some(x=>!Number.isFinite(x)))return null;
 const avg=x=>x.reduce((s,v)=>s+v,0)/x.length,am=avg(a),bm=avg(b);
 const cov=a.reduce((s,v,i)=>s+(v-am)*(b[i]-bm),0),da=a.reduce((s,v)=>s+(v-am)**2,0),db=b.reduce((s,v)=>s+(v-bm)**2,0);
 return da&&db?cov/Math.sqrt(da*db):null;
}
export function rankCorrelation(a,b){
 const keys=a.filter(x=>x.score!=null&&b.some(y=>y.key===x.key&&y.score!=null)).map(x=>x.key);
 const left=keys.map(key=>a.find(x=>x.key===key).score),right=keys.map(key=>b.find(x=>x.key===key).score);
 return pearson(left.map(x=>percentile(x,left)),right.map(x=>percentile(x,right)));
}
