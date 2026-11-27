import {META_POLICY} from './meta.js';
import {applyRecommendationPolicy} from './recommendationPolicy.js';

// Default live policy. META_POLICY remains the immutable v2.1 comparison baseline.
export const META_V22_POLICY=Object.freeze({
 version:'meta-v2.2-damage-55-35-10-s8-a8',
 weights:META_POLICY.weights,lowPickRate:META_POLICY.lowPickRate,
 roleWeights:Object.freeze({damage:Object.freeze({winRate:.55,pickRate:.35,banRate:.10})}),
 damageTopPickMinimum:8,
});
export function applyMetaRecommendation(hero,policy=META_V22_POLICY){
 const current=applyRecommendationPolicy(hero);
 if(policy.version!==META_V22_POLICY.version||hero.role!=='damage')return current;
 const limited=['S','A'].includes(current.tier)&&current.statistics.pickRate<META_V22_POLICY.damageTopPickMinimum;
 const tier=limited?'B':current.tier;
 return {...current,tier,recommendationGroup:tier==='A'?'a-standard':tier??'unclassified',recommendationCapped:current.recommendationCapped||limited,tierPolicy:META_V22_POLICY.version};
}
