// Offline experiment only. No imports from this module in the application.
import {attachMetaTiers,META_POLICY} from '../../src/domain/meta.js';
import {applyRecommendationPolicy,RECOMMENDATION_POLICY} from '../../src/domain/recommendationPolicy.js';
import {capDamageTier,rankExperiment,tierSummary} from './damageTierCalibration.js';
export const WEIGHT_EXPERIMENT_VERSION='damage-meta-v22-factorial-1';
export const CANDIDATES=Object.freeze({A:{weights:{winRate:.65,pickRate:.25,banRate:.10},caps:false},B:{weights:{winRate:.65,pickRate:.25,banRate:.10},caps:true},C:{weights:{winRate:.55,pickRate:.35,banRate:.10},caps:false},D:{weights:{winRate:.55,pickRate:.35,banRate:.10},caps:true}});
export function simulateDamageWeights(heroes,records){
 const candidates={};
 for(const [key,configuration]of Object.entries(CANDIDATES)){
  // Recompute percentiles, score ranks, provisional tiers and base S eligibility.
  // Partition by role so the experimental weights never touch tank/support.
  const defaults=attachMetaTiers(heroes,records,META_POLICY);
  const damage=attachMetaTiers(heroes.filter(h=>h.role==='damage'),records,{...META_POLICY,weights:configuration.weights});
  const byKey=new Map(damage.map(h=>[h.key,h]));
  const scored=defaults.map(h=>h.role==='damage'?byKey.get(h.key):h);
  const rows=scored.map(h=>{const current=applyRecommendationPolicy(h);return configuration.caps?capDamageTier(current,8,5):current;});
  const order=rankExperiment(rows.filter(h=>h.role==='damage'));
  const displayRanks=new Map(order.map((h,i)=>[h.key,h.tier?i+1:null]));
  candidates[key]={configuration,rows:rows.map(h=>({...h,...(h.role==='damage'?{displayRank:displayRanks.get(h.key)}:{})})),counts:tierSummary(rows)};
 }
 const baseline=new Map(candidates.A.rows.map(h=>[h.key,h]));
 for(const candidate of Object.values(candidates))candidate.rows=candidate.rows.map(h=>{if(h.role!=='damage')return h;const a=baseline.get(h.key);return {...h,scoreDelta:Number.isFinite(h.metaScore)&&Number.isFinite(a.metaScore)?h.metaScore-a.metaScore:null,rankDelta:h.displayRank&&a.displayRank?a.displayRank-h.displayRank:null,scoreRankDelta:h.roleRank&&a.roleRank?a.roleRank-h.roleRank:null};});
 return {version:WEIGHT_EXPERIMENT_VERSION,operatingScorePolicy:META_POLICY.version,operatingRecommendationPolicy:RECOMMENDATION_POLICY.version,candidates};
}
