// Offline research only. No production module imports this file.
import {attachMetaTiers,percentile,META_POLICY} from './meta.js';
import {roleTier} from './tier.js';
export const EXPOSURE_MODELS=Object.freeze([
 {id:'A-v2',kind:'baseline'},
 {id:'B-55-35-10',kind:'weights'},
 ...[0,.15,.25,.35,.5].map(gamma=>({id:`C-g${gamma}`,kind:'upper-percentile',gamma})),
 ...['raw-win','symmetric-percentile'].flatMap(kind=>[0,.25,.5,1].flatMap(lambda=>[.5,.75].map(alphaMin=>({id:`${kind}-l${lambda}-a${alphaMin}`,kind,lambda,alphaMin}))))
].map(Object.freeze));
export function median(values){if(!Array.isArray(values)||!values.length||values.some(v=>!Number.isFinite(v)))return null;const a=[...values].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;}
export function exposureAlpha(pickRate,positiveMedian,{lambda=0,alphaMin=.5}={}){
 if(!Number.isFinite(pickRate)||pickRate<0||!Number.isFinite(positiveMedian)||positiveMedian<=0)return null;
 if(!Number.isFinite(lambda)||lambda<0||!Number.isFinite(alphaMin)||alphaMin<0||alphaMin>1)throw new Error('Invalid exposure parameters');
 return lambda===0?1:Math.min(1,Math.max(alphaMin,pickRate/(pickRate+lambda*positiveMedian)));
}
export function evaluateExposureModel(heroes,records,model=EXPOSURE_MODELS[0]){
 if(!['baseline','weights','upper-percentile','raw-win','symmetric-percentile'].includes(model.kind))throw new Error('Unknown research model');
 if(model.kind==='upper-percentile'&&(!Number.isFinite(model.gamma)||model.gamma<0||model.gamma>1))throw new Error('Invalid gamma');
 if(['raw-win','symmetric-percentile'].includes(model.kind)&&(!Number.isFinite(model.lambda)||model.lambda<0||!Number.isFinite(model.alphaMin)||model.alphaMin<0||model.alphaMin>1))throw new Error('Invalid exposure parameters');
 if(new Set(heroes.map(h=>h.key)).size!==heroes.length||new Set(records.map(r=>r.hero)).size!==records.length)throw new Error('Duplicate research key');
 const result=attachMetaTiers(heroes,records,META_POLICY).map(h=>({...h,originalWinRate:h.statistics?.winRate??null,originalWinPercentile:h.winPercentile,adjustedWinRate:h.statistics?.winRate??null,adjustedWinPercentile:h.winPercentile,experimentalScore:h.metaScore,winRateRank:null,alpha:null,exposureRatio:null,roleMedianWinRate:null,roleMedianPositivePickRate:null,adjustmentSkipped:h.metaScore===null?'ineligible-statistics':null,researchModel:model.id}));
 for(const role of ['tank','damage','support']){
  // Use the same complete, quality-checked role cohort as production v2.
  const group=result.filter(h=>h.role===role&&h.metaScore!==null),medWin=median(group.map(h=>h.statistics.winRate)),medPick=median(group.map(h=>h.statistics.pickRate).filter(v=>v>0));
  const byWin=[...group].sort((a,b)=>b.statistics.winRate-a.statistics.winRate||a.key.localeCompare(b.key,'en'));let winRank=0;
  byWin.forEach((h,i)=>{if(!i||h.statistics.winRate!==byWin[i-1].statistics.winRate)winRank=i+1;h.winRateRank=winRank;});
  for(const h of group){
   h.roleMedianWinRate=medWin;h.roleMedianPositivePickRate=medPick;
   h.adjustmentSkipped=group.length<2?'insufficient-role-size':medPick===null||medPick<=0?'no-positive-pick-median':null;
   if(h.adjustmentSkipped)continue;
   h.exposureRatio=Math.min(1,h.statistics.pickRate/medPick);
   if(model.kind==='upper-percentile')h.adjustedWinPercentile=h.winPercentile-model.gamma*(1-h.exposureRatio)*Math.max(0,h.winPercentile-50);
   if(model.kind==='raw-win'||model.kind==='symmetric-percentile'){
    h.alpha=exposureAlpha(h.statistics.pickRate,medPick,model);
    if(model.kind==='raw-win')h.adjustedWinRate=model.lambda===0?h.statistics.winRate:medWin+h.alpha*(h.statistics.winRate-medWin);
    else h.adjustedWinPercentile=50+h.alpha*(h.winPercentile-50);
   }
  }
  for(const h of group){
   if(model.kind==='raw-win'&&!h.adjustmentSkipped)h.adjustedWinPercentile=percentile(h.adjustedWinRate,group.map(p=>p.adjustedWinRate));
   const w=model.kind==='weights'?[.55,.35,.10]:[.65,.25,.10];
   h.experimentalScore=Number((w[0]*h.adjustedWinPercentile+w[1]*h.pickPercentile+w[2]*h.banPercentile).toFixed(10));h.metaScore=h.experimentalScore;
  }
  group.sort((a,b)=>b.metaScore-a.metaScore||a.key.localeCompare(b.key,'en'));let rank=0;
  group.forEach((h,i)=>{
   if(!i||h.metaScore!==group[i-1].metaScore)rank=i+1;
   h.roleRank=rank;h.provisionalTier=roleTier(rank,group.length);
   // Eligibility comes from raw winrate and original QW/QP, never adjusted inputs.
   h.capped=h.provisionalTier==='S'&&h.eligibility.some(rule=>!rule.passed);h.tier=h.capped?'A':h.provisionalTier;
  });
 }
 return result;
}
