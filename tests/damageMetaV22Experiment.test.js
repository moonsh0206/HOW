import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateDamageWeights,WEIGHT_EXPERIMENT_VERSION} from '../scripts/lib/damageMetaV22Experiment.js';
import {attachMetaTiers,META_POLICY} from '../src/domain/meta.js';
import {applyRecommendationPolicy,RECOMMENDATION_POLICY} from '../src/domain/recommendationPolicy.js';
import {compareHowTier,normalizeHeroes} from '../src/models/heroModel.js';
import {roleTier} from '../src/domain/tier.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const live=read('docs/qa/damage-tier-calibration/live.json'),heroes=normalizeHeroes(live.heroes);

test('factorial A exactly matches operating v2.1, and C/D recompute score ranks and provisional tiers',()=>{
 const result=simulateDamageWeights(heroes,live.result.records),baseline=attachMetaTiers(heroes,live.result.records).map(applyRecommendationPolicy);
 for(const key of ['A','B','C','D'])for(const h of result.candidates[key].rows){const b=baseline.find(b=>b.key===h.key);if(h.role!=='damage')assert.deepEqual(h,b);else{
  if(key==='A')for(const field of Object.keys(b))assert.deepEqual(h[field],b[field]);
  if(Number.isFinite(h.metaScore)){
   assert.equal(h.provisionalTier,roleTier(h.roleRank,h.roleSize));
   const weight=key==='C'||key==='D'?[.55,.35,.1]:[.65,.25,.1];
   assert.equal(h.metaScore,Number((weight[0]*h.winPercentile+weight[1]*h.pickPercentile+weight[2]*h.banPercentile).toFixed(10)));
  }
 }}
 const a=result.candidates.A.rows,c=result.candidates.C.rows;
 assert(c.some(h=>h.role==='damage'&&h.roleRank!==a.find(b=>b.key===h.key).roleRank));
 assert(c.some(h=>h.role==='damage'&&h.provisionalTier!==a.find(b=>b.key===h.key).provisionalTier));
 for(const key of ['A','B','C','D']){const ordered=result.candidates[key].rows.filter(h=>h.role==='damage').sort(compareHowTier);ordered.forEach((h,i)=>assert.equal(h.displayRank,i+1));}
});

const generic=()=>Array.from({length:10},(_,i)=>({key:'test-'+i,name:'Test '+i,role:'damage'}));
test('8% and 5% inclusive caps fall through without promoting a provisional B/C/D; sub-50% S remains prohibited',()=>{
 const hs=generic();
 for(const pick of [4.9,5,5.1,7.9,8,8.1]){
  const records=hs.map((h,i)=>({hero:h.key,winRate:i?45-i:60,pickRate:i?.1:pick,banRate:i?0:90}));
  const r=simulateDamageWeights(hs,records);for(const k of ['B','D'])assert.equal(r.candidates[k].rows[0].tier,pick>=8?'S':pick>=5?'A':'B');
 }
 const weak=hs.map((h,i)=>({hero:h.key,winRate:i?40-i:49.99,pickRate:i?1:99,banRate:i?0:99}));
 for(const c of Object.values(simulateDamageWeights(hs,weak).candidates)){
  assert.equal(c.rows[0].provisionalTier,'S');assert.equal(c.rows[0].tier,'A');assert.equal(c.counts.S.length,0);
 }
});

test('missing metrics remain unclassified; tied scores and input ordering have deterministic rank/tier results',()=>{
 const hs=generic(),records=hs.map(h=>({hero:h.key,winRate:52,pickRate:8,banRate:1}));
 for(const field of ['winRate','pickRate','banRate'])for(const c of Object.values(simulateDamageWeights(hs,records.map((r,i)=>i?r:{...r,[field]:null})).candidates))assert.equal(c.rows[0].tier,null);
 const a=simulateDamageWeights(hs,records),b=simulateDamageWeights([...hs].reverse(),[...records].reverse());
 for(const k of ['A','B','C','D']){assert(a.candidates[k].rows.every(h=>h.roleRank===1));assert.deepEqual(a.candidates[k].rows.map(h=>[h.key,h.roleRank,h.displayRank,h.tier]).sort(),b.candidates[k].rows.map(h=>[h.key,h.roleRank,h.displayRank,h.tier]).sort());}
});

test('all 66 actual frames retain S gates and unchanged tank/support; source data and production versions remain untouched',()=>{
 const paths=['docs/qa/damage-tier-calibration/live.json','docs/qa/damage-tier-calibration/comparison.json','src/domain/meta.js','src/domain/recommendationPolicy.js',...fs.readdirSync('public/data/snapshots').map(f=>'public/data/snapshots/'+f)];
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),before=paths.map(hash);let frames=0;
 for(const p of paths.filter(p=>p.startsWith('public/data/snapshots/')&&!p.endsWith('index.json')))for(const frame of expandSnapshotFile(read(p),{includeDerived:true})){
  frames++;const result=simulateDamageWeights(heroes,frame.records),a=result.candidates.A.rows;
  for(const [k,c]of Object.entries(result.candidates))for(const h of c.rows){if(h.role!=='damage')assert.deepEqual(h,a.find(b=>b.key===h.key));if(h.tier==='S'){assert(h.eligibility.every(r=>r.passed));assert(h.statistics.winRate>=50);if(h.role==='damage')assert(h.statistics.pickRate>=(['B','D'].includes(k)?8:5));}}
 }
 assert.equal(frames,66);assert.deepEqual(paths.map(hash),before);assert.equal(META_POLICY.version,'meta-v2');assert.equal(RECOMMENDATION_POLICY.version,'meta-v2.1');assert.notEqual(WEIGHT_EXPERIMENT_VERSION,META_POLICY.version);
});
