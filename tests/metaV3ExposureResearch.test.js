import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {EXPOSURE_MODELS,evaluateExposureModel,median,exposureAlpha} from '../src/domain/metaV3ExposureResearch.js';
import {attachMetaTiers,META_POLICY} from '../src/domain/meta.js';
import {normalizeStatistics,DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {combineDivisionStatistics} from '../src/models/compositeStatisticsModel.js';
const config=id=>EXPOSURE_MODELS.find(m=>m.id===id);
const heroes=Array.from({length:8},(_,i)=>({key:`hero-${i}`,name:`Hero ${i}`,role:'damage'}));
const records=heroes.map((h,i)=>({hero:h.key,winRate:48+i,pickRate:[12,16,18,20,8,6,2,1][i],banRate:i}));
const projection=rows=>rows.map(h=>[h.key,h.metaScore,h.roleRank,h.tier,h.provisionalTier,h.capped,h.eligibility]);
test('research baselines: gamma/lambda zero identical to v2; 55/35/10 exact; no mutation',()=>{
 const before=JSON.stringify({heroes,records}),baseline=attachMetaTiers(heroes,records);
 for(const m of EXPOSURE_MODELS.filter(m=>m.kind==='baseline'||m.gamma===0||m.lambda===0))assert.deepEqual(projection(evaluateExposureModel(heroes,records,m)),projection(baseline),m.id);
 const b=attachMetaTiers(heroes,records,{...META_POLICY,weights:{winRate:.55,pickRate:.35,banRate:.10}});assert.deepEqual(projection(evaluateExposureModel(heroes,records,config('B-55-35-10'))),projection(b));assert.equal(JSON.stringify({heroes,records}),before);assert.equal(DEFAULT_FILTERS.division,'diamond_plus');assert.equal(EXPOSURE_MODELS.length,23);
});
test('C exact formula: only above-neutral QW of below-median picks reduced, raw win unchanged, S gates use raw inputs',()=>{
 const out=evaluateExposureModel(heroes,records,config('C-g0.25'));
 for(const h of out){const R=Math.min(1,h.statistics.pickRate/h.roleMedianPositivePickRate),expected=h.winPercentile-.25*(1-R)*Math.max(0,h.winPercentile-50);assert.equal(h.adjustedWinPercentile,expected);assert.equal(h.originalWinRate,h.adjustedWinRate);assert.deepEqual(h.eligibility,attachMetaTiers(heroes,records).find(b=>b.key===h.key).eligibility);if(h.winPercentile<=50||R===1)assert.equal(h.adjustedWinPercentile,h.winPercentile);}
 const niche=out.at(-1);assert(niche.adjustedWinPercentile<niche.winPercentile);assert.equal(niche.statistics.winRate,55);
});
test('exposure alternatives: alpha bounded, symmetric below-median uplift explicit, raw-win adjustment repercentiles',()=>{
 assert.equal(median([1,4,2,3]),2.5);assert.equal(median([]),null);assert.equal(exposureAlpha(0,10,{lambda:0,alphaMin:.5}),1);assert.equal(exposureAlpha(0,10,{lambda:1,alphaMin:.75}),.75);assert.equal(exposureAlpha(1,null),null);
 for(const m of EXPOSURE_MODELS.filter(m=>m.kind==='raw-win'||m.kind==='symmetric-percentile'))for(const h of evaluateExposureModel(heroes,records,m)){assert(h.alpha>=m.alphaMin&&h.alpha<=1);assert(h.adjustedWinPercentile>=0&&h.adjustedWinPercentile<=100);assert(h.metaScore>=0&&h.metaScore<=100);}
 const below=records.map((r,i)=>({...r,pickRate:i===0?1:20}));const symmetric=evaluateExposureModel(heroes,below,config('symmetric-percentile-l1-a0.5'));assert(symmetric[0].adjustedWinPercentile>symmetric[0].originalWinPercentile);
 assert.throws(()=>evaluateExposureModel(heroes,records,{kind:'upper-percentile',gamma:2}));assert.throws(()=>evaluateExposureModel(heroes,records,{kind:'raw-win',lambda:-1,alphaMin:.5}));
});
test('quality and absent exposure: review zeros/null not scored; real zero ban preserved; missing positive median skipped with reason',()=>{
 const input=normalizeStatistics([{hero:'hero-0',winrate:0,pickrate:10,banrate:0},{hero:'hero-1',winrate:55,pickrate:null,banrate:0},{hero:'hero-2',winrate:52,pickrate:0,banrate:0},{hero:'hero-3',winrate:53,pickrate:0,banrate:0}]);
 for(const m of EXPOSURE_MODELS){const out=evaluateExposureModel(heroes,input,m);assert.equal(out[0].metaScore,null);assert.equal(out[1].metaScore,null);assert.equal(out[2].adjustmentSkipped,'no-positive-pick-median');assert.equal(out[2].statistics.banRate,0);assert.equal(out[4].tier,null);}
 const one=evaluateExposureModel(heroes,[records[0]],config('C-g0.5'));assert.equal(one[0].adjustmentSkipped,'insufficient-role-size');assert.equal(one[0].tier,'A');
 const newcomer=evaluateExposureModel([...heroes,{key:'new-hero',name:'New Hero',role:'damage'}],records,config('C-g0.25'));assert.equal(newcomer.at(-1).tier,null);assert.equal(newcomer.at(-1).adjustmentSkipped,'ineligible-statistics');assert.deepEqual(projection(newcomer.slice(0,8)),projection(evaluateExposureModel(heroes,records,config('C-g0.25'))));
 const parts=['diamond','master','grandmaster'].map(division=>({filters:{...DEFAULT_FILTERS,division},records:input}));parts[1].records=[];const mean=combineDivisionStatistics(DEFAULT_FILTERS,parts);assert(evaluateExposureModel(heroes,mean,config('C-g0.25')).every(h=>h.tier===null));
});
test('ties, low-win popular and role independence: stable ties, no low-win S and no hero-specific exceptions',()=>{
 const tied=records.map(r=>({...r,winRate:52,pickRate:10,banRate:0}));for(const m of EXPOSURE_MODELS){const out=evaluateExposureModel(heroes,tied,m);assert(out.every(h=>h.roleRank===1));assert(out.every(h=>h.metaScore===50));}
 const low=records.map((r,i)=>i===0?{...r,winRate:45,pickRate:99,banRate:99}:r);for(const m of EXPOSURE_MODELS)assert.notEqual(evaluateExposureModel(heroes,low,m)[0].tier,'S');
 const supports=heroes.map(h=>({...h,key:'support-'+h.key,role:'support'})),supportRecords=records.map(r=>({...r,hero:'support-'+r.hero}));assert.deepEqual(projection(evaluateExposureModel([...heroes,...supports],[...records,...supportRecords],config('C-g0.35')).slice(0,8)),projection(evaluateExposureModel(heroes,records,config('C-g0.35'))));
});
test('actual frozen 8 cohorts: 432 baseline results exact; parameters monotonic in score for C, same original eligibility',async()=>{
 const evidence=JSON.parse(await fs.readFile(new URL('../docs/research/tier-design/evidence.json',import.meta.url),'utf8'));let total=0;
 for(const c of evidence.cases){const records=normalizeStatistics(c.api.records),a=evaluateExposureModel(evidence.heroes.records,records);assert.deepEqual(projection(a),projection(attachMetaTiers(evidence.heroes.records,records)));total+=a.length;
  const candidates=EXPOSURE_MODELS.filter(m=>m.kind==='upper-percentile').map(m=>evaluateExposureModel(evidence.heroes.records,records,m));for(let i=0;i<a.length;i++)for(let j=1;j<candidates.length;j++){assert(candidates[j][i].metaScore<=candidates[j-1][i].metaScore+1e-9);assert.deepEqual(candidates[j][i].eligibility,a[i].eligibility);}
 }assert.equal(total,432);
});
test('isolation: research evaluation cannot write protected production files or snapshots and has no UI import',async()=>{
 const files=['src/domain/meta.js','src/domain/metaPolicies.js','src/models/statisticsModel.js','src/main.js','public/data/snapshots/index.json'];const hash=async p=>createHash('sha256').update(await fs.readFile(new URL('../'+p,import.meta.url))).digest('hex');const before=await Promise.all(files.map(hash));evaluateExposureModel(heroes,records,config('C-g0.5'));assert.deepEqual(await Promise.all(files.map(hash)),before);assert(!(await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8')).includes('metaV3ExposureResearch'));
});
