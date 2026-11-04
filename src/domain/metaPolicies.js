import {META_POLICY} from './meta.js';
export const BASELINE_META_POLICY=META_POLICY;
export const LOCAL_META_EXPERIMENT=Object.freeze({version:'local-60-27-13',weights:Object.freeze({winRate:.60,pickRate:.27,banRate:.13}),lowPickRate:1});
export const ALTERNATIVE_META_POLICY=Object.freeze({version:'research-60-25-15',weights:Object.freeze({winRate:.60,pickRate:.25,banRate:.15}),lowPickRate:1});
// The production build cannot opt into a local experiment, even if an env flag leaks.
export function selectMetaPolicy({development=false,experiment='off'}={}){return development&&experiment==='60-27-13'?LOCAL_META_EXPERIMENT:BASELINE_META_POLICY;}
