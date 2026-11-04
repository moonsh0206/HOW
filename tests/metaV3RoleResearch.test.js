// Synthetic fixtures below validate code only; they are not service statistics or research inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MODELS,evaluate,roleContributions,rawWinScore,rankCorrelation} from '../docs/research/meta-v3-45252010/model.mjs';
import {attachMetaTiers} from '../src/domain/meta.js';
import {normalizeStatistics} from '../src/models/statisticsModel.js';
const heroes=[{key:'a',role:'damage'},{key:'b',role:'damage'}];
const context={platform:'pc',region:'asia',division:'diamond',gamemode:'competitive',map:'all',patch:'synthetic-test-patch',patchVerified:true};
const weights={damage:{finalBlowsPer10:1/3,eliminationsPerLife:1/3,deathsPer10:1/3}};
const performance=()=>({population:'hero-aggregate',permission:'granted',sourceUrl:'https://example.test/synthetic-only',patchVerified:true,cohort:{...context},definitions:{finalBlowsPer10:{definitionId:'synthetic-final-blows',unit:'per-10-minutes',direction:'higher',comparableWithinRole:true},eliminationsPerLife:{definitionId:'synthetic-eliminations-life',unit:'per-life',direction:'higher',comparableWithinRole:true},deathsPer10:{definitionId:'synthetic-deaths',unit:'per-10-minutes',direction:'lower',comparableWithinRole:true}},rows:[{hero:'a',finalBlowsPer10:0,eliminationsPerLife:0,deathsPer10:10},{hero:'b',finalBlowsPer10:10,eliminationsPerLife:2,deathsPer10:0}]});
test('research partial formula and score range; raw win normalization uses actual differences',()=>{
 const rows=[{hero:'a',winRate:51,pickRate:2,banRate:0},{hero:'b',winRate:52,pickRate:1,banRate:1}];
 const result=evaluate(heroes,rows,MODELS.find(m=>m.id==='B20'));
 for(const h of result)assert(Math.abs(h.score-(.45*h.W+.25*h.P+.20*h.B)/.9)<1e-8);
 assert(Math.abs(rawWinScore(50.1,5)-rawWinScore(50,5)-.5)<1e-9);assert.equal(rawWinScore(100,10),100);assert.equal(rawWinScore(0,10),0);assert.equal(rawWinScore(null,5),null);
 const missing=evaluate(heroes,[rows[0],{...rows[1],banRate:null}],MODELS[0]);assert.equal(missing[1].score,null);
});
test('research full model: no R dataset means null, never 0/50 or partial-score fallback',()=>{
 const rows=heroes.map(h=>({hero:h.key,winRate:51,pickRate:5,banRate:0}));
 for(const id of ['C20','C15'])assert(evaluate(heroes,rows,MODELS.find(m=>m.id===id)).every(h=>h.score===null&&h.R===null&&h.rank===null&&h.tier===null));
});
test('R provenance: individual players, mismatched conditions, unknown patch and unlicensed data rejected',()=>{
 const samples=[{...performance(),population:'player-profile'},{...performance(),permission:'unknown'},{...performance(),patchVerified:false}];
 for(const key of ['region','division','gamemode','map','patch'])samples.push({...performance(),cohort:{...context,[key]:'different'}});
 for(const sample of samples)assert.equal(roleContributions(heroes,context,sample,weights).status,'unavailable');
 assert.equal(roleContributions(heroes,{...context,patchVerified:false},performance(),weights).scores.size,0);
 assert.equal(roleContributions(heroes,context,performance()).scores.size,0);
});
test('R explicit weights, comparable units, full role coverage and inverse deaths; no imputation',()=>{
 const valid=roleContributions(heroes,context,performance(),weights);assert.equal(valid.status,'verified');assert.equal(valid.scores.get('a'),0);assert(Math.abs(valid.scores.get('b')-100)<1e-9);
 const missing=performance();missing.rows[1].deathsPer10=null;assert.equal(roleContributions(heroes,context,missing,weights).scores.size,0);
 const badUnit=performance();badUnit.definitions.finalBlowsPer10.unit='per-minute';assert.equal(roleContributions(heroes,context,badUnit,weights).scores.size,0);
 const rows=heroes.map(h=>({hero:h.key,winRate:51,pickRate:5,banRate:0}));
 const full=evaluate(heroes,rows,MODELS.find(m=>m.id==='C20'),{rateContext:context,performance:performance(),roleWeights:weights});
 for(const h of full)assert(Math.abs(h.score-(.45*h.W+.25*h.P+.20*h.B+.10*h.R))<1e-8);
});
test('S gates survive popularity/ban pressure, ties are deterministic and missing metrics stay unclassified',()=>{
 const list=Array.from({length:10},(_,i)=>({key:`h${i}`,role:'tank'}));
 const rows=list.map((h,i)=>({hero:h.key,winRate:i===0?49:50+i,pickRate:i===0?99:i,banRate:i===0?99:i}));
 for(const model of MODELS.filter(m=>!m.full)){const result=evaluate(list,rows,model);assert(result.filter(h=>h.tier==='S').every(h=>h.statistics.winRate>=50));}
 const ties=evaluate(heroes,heroes.map(h=>({hero:h.key,winRate:51,pickRate:0,banRate:0})),MODELS[0]);assert.equal(ties[0].rank,ties[1].rank);assert.equal(ties[0].tier,'A');
 assert.equal(rankCorrelation(ties,ties),null); // A constant ordering has no variance.
});
test('frozen eight-cohort dataset: 432 baseline matches, C withheld, exported partial scores and unchanged production',()=>{
 const evidence=JSON.parse(fs.readFileSync(new URL('../docs/research/tier-design/evidence.json',import.meta.url)));
 assert.equal(evidence.cases.length,8);let count=0;
 for(const c of evidence.cases){const records=normalizeStatistics(c.api.records),actual=attachMetaTiers(evidence.heroes.records,records),result=evaluate(evidence.heroes.records,records,MODELS[0]);count+=result.length;for(const h of result){const a=actual.find(x=>x.key===h.key);assert.equal(h.score,a.metaScore);assert.equal(h.rank,a.roleRank);assert.equal(h.tier,a.tier);}}
 assert.equal(count,432);
 const report=JSON.parse(fs.readFileSync(new URL('../docs/research/meta-v3-45252010/results.json',import.meta.url)));assert.equal(report.summary.C20.scored,0);assert.equal(report.summary.C15.scored,0);assert.equal(report.summary.B20.scored,432);
});
