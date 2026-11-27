// Offline-only experiment. Never imported by the application or collectors.
import {attachMetaTiers,META_POLICY} from '../../src/domain/meta.js';
import {applyRecommendationPolicy,recommendationOrder,RECOMMENDATION_POLICY} from '../../src/domain/recommendationPolicy.js';
import {roleTier} from '../../src/domain/tier.js';
export const EXPERIMENT_VERSION='damage-calibration-v2.2-candidates-1';
const tiers=['S','A','B','C','D'];
export function quantile(values,q){if(!values.length)return null;if(q<0||q>1||values.some(v=>!Number.isFinite(v)))throw Error('Invalid quantile');const sorted=[...values].sort((a,b)=>a-b),i=(sorted.length-1)*q;return sorted[Math.floor(i)]+(sorted[Math.ceil(i)]-sorted[Math.floor(i)])*(i%1);}
export function pickDistribution(rows){const picks=rows.filter(h=>h.role==='damage'&&Number.isFinite(h.metaScore)).map(h=>h.statistics.pickRate);return {count:picks.length,min:quantile(picks,0),q1:quantile(picks,.25),median:quantile(picks,.5),q3:quantile(picks,.75),max:quantile(picks,1)};}
export function capDamageTier(hero,sMinimum,aMinimum){
 if(!Number.isFinite(sMinimum)||!Number.isFinite(aMinimum)||sMinimum<aMinimum||aMinimum<0)throw Error('Invalid caps');
 if(hero.role!=='damage'||!tiers.includes(hero.tier))return {...hero};
 const pick=hero.statistics?.pickRate;if(!Number.isFinite(pick))return {...hero,tier:null,recommendationGroup:'unclassified'};
 let tier=hero.tier;if(tier==='S'&&pick<sMinimum)tier='A';if(tier==='A'&&pick<aMinimum)tier='B';
 return {...hero,tier,recommendationGroup:applyRecommendationPolicy({...hero,tier}).recommendationGroup};
}
export function adjustedScore(score,pick,lambda,reference){
 if(!Number.isFinite(score)||!Number.isFinite(pick)||pick<0)return null;
 if(!Number.isFinite(lambda)||lambda<0||lambda>1||!Number.isFinite(reference)||reference<=0)throw Error('Invalid adjustment');
 return score*(1-lambda*Math.max(0,1-pick/reference));
}
export function simulateDamageCandidates(heroes,records){
 const raw=attachMetaTiers(heroes,records),baseline=raw.map(applyRecommendationPolicy),distribution=pickDistribution(baseline);
 const relative={s:Math.max(5,distribution.q3??5),a:distribution.median??0,method:'type-7-pick-quantiles; S=max(5,Q75), A=median'};
 const variants={current:baseline,s7a4:baseline.map(h=>capDamageTier(h,7,4)),s8a5:baseline.map(h=>capDamageTier(h,8,5)),relative:baseline.map(h=>capDamageTier(h,Math.max(relative.s,relative.a),relative.a))};
 const continuous={};
 for(const lambda of [.08,.12])for(const [refName,reference]of [['5',5],['6',6],['median',distribution.median]]){
  const key=`lambda${lambda}-ref${refName}`,available=Number.isFinite(reference)&&reference>0;
  const scored=baseline.map(h=>({...h,adjustedScore:h.role==='damage'?(available?adjustedScore(h.metaScore,h.statistics?.pickRate,lambda,reference):null):h.metaScore}));
  const group=scored.filter(h=>h.role==='damage'&&Number.isFinite(h.adjustedScore)).sort((a,b)=>b.adjustedScore-a.adjustedScore||a.key.localeCompare(b.key,'en'));
  let rank=0;for(const [i,h]of group.entries()){if(!i||h.adjustedScore!==group[i-1].adjustedScore)rank=i+1;h.experimentRank=rank;let tier=roleTier(rank,group.length);if(tier==='S'&&h.eligibility.some(r=>!r.passed))tier='A';tier=applyRecommendationPolicy({...h,tier}).tier;
   // Experiment never promotes a baseline B/C/D hero through another hero's penalty.
   h.tier=tiers[Math.max(tiers.indexOf(h.tier),tiers.indexOf(tier))];h.recommendationGroup=applyRecommendationPolicy(h).recommendationGroup;
  }
  continuous[key]={lambda,reference,available,rows:scored};
 }
 return {version:EXPERIMENT_VERSION,scorePolicy:META_POLICY.version,recommendationPolicy:RECOMMENDATION_POLICY.version,distribution,relative,raw,variants,continuous};
}
export function rankExperiment(rows,{adjusted=false}={}){return [...rows].sort((a,b)=>recommendationOrder(a)-recommendationOrder(b)||(adjusted?b.adjustedScore-a.adjustedScore:b.metaScore-a.metaScore)||a.name.localeCompare(b.name,'ko')||a.key.localeCompare(b.key,'en'));}
export function tierSummary(rows){return Object.fromEntries([...tiers,'unclassified'].map(t=>[t,rows.filter(h=>h.role==='damage'&&(h.tier??'unclassified')===t).map(h=>h.key)]));}
