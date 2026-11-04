import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPatchHistory,buildPatchTimeline,verifiedPatch } from '../src/models/patchHistoryModel.js';
import { retentionPlan } from '../src/models/snapshotRetentionModel.js';
import { DEFAULT_FILTERS } from '../src/models/statisticsModel.js';
import { renderMetricHistory } from '../src/views/pickHistoryView.js';
import { validateSubroles } from '../src/models/subroleModel.js';
import subroles from '../src/data/subroles.json' with { type:'json' };
import { JSDOM } from 'jsdom';
const catalog=[{id:'p1',type:'balance',effectiveAt:'2026-09-29T00:00:00Z',sourceUrl:'https://overwatch.blizzard.com/ko-kr/news/patch-notes/'},{id:'p2',type:'balance',effectiveAt:'2026-10-29T00:00:00Z',sourceUrl:'https://overwatch.blizzard.com/ko-kr/news/patch-notes/'}];
const now=Date.parse('2026-11-03T00:00:00Z');
const snap=(patch,collectedAt,value=5)=>({patch,collectedAt,filters:DEFAULT_FILTERS,patchVerification:{status:'verified',catalogId:patch,sourceUrl:catalog[0].sourceUrl,verifiedAt:'2026-11-03T00:00:00Z',statisticsWindow:'since-patch-start'},records:[{hero:'genji',pickRate:value}]});
test('patch history: explicit evidence only, exact cohort, current patch and separate windows',()=>{
 const a=snap('p1','2026-10-01T00:00:00Z'),b=snap('p1','2026-10-01T12:00:00Z',6),c=snap('p2','2026-11-01T00:00:00Z',7);
 const options={now,catalog,currentPatch:'p1'};
 assert.equal(buildPatchHistory([a,b,c],'genji',DEFAULT_FILTERS,options).points.length,2);
 assert.equal(buildPatchHistory([a,b,c],'genji',DEFAULT_FILTERS,options).segments.length,1);
 const compare=buildPatchHistory([a,b,c],'genji',DEFAULT_FILTERS,{...options,mode:'compare'});
 assert.equal(compare.points.length,3);assert.equal(compare.segments.length,0);assert.equal(compare.comparisonWindow,'different-patch-windows');
 assert.equal(buildPatchHistory([a,b],'genji',DEFAULT_FILTERS,{...options,mode:'compare'}).points.length,0);
 for(const bad of [{...a,patch:null},{...a,patchVerification:null},{...a,patchVerification:{...a.patchVerification,statisticsWindow:'unknown'}},{...a,collectedAt:'bad'}])assert.equal(buildPatchHistory([bad],'genji',DEFAULT_FILTERS,options).points.length,0);
 assert.equal(verifiedPatch({...a,patchVerification:null},catalog),null);
 assert.equal(buildPatchHistory([a],'genji',{...DEFAULT_FILTERS,region:'europe'},options).points.length,0);
 assert.equal(buildPatchHistory([a],'genji',DEFAULT_FILTERS,{...options,releasedAt:'2026-10-02T00:00:00Z'}).points.length,0);
 assert.equal(buildPatchHistory([{...a,records:[]}],'genji',DEFAULT_FILTERS,options).points.length,0);
 assert.equal(buildPatchHistory([a,{...b,records:[]},snap('p1','2026-10-02T00:00:00Z')],'genji',DEFAULT_FILTERS,options).segments.length,0);
});
test('retention dry-run: keeps two real representatives, HOT seven-day window and all unknown/current patches',()=>{
 const snapshots=[snap('p1','2026-10-01T00:00:00Z'),snap('p1','2026-10-02T00:00:00Z'),snap('p1','2026-10-03T00:00:00Z'),snap('p2','2026-11-01T00:00:00Z'),{...snap(null,'2026-01-01T00:00:00Z'),patchVerification:null}];
 const entries=snapshots.map((snapshot,i)=>({snapshot,file:`${i}.json`}));const before=JSON.stringify(entries);
 const plan=retentionPlan(entries,{now,catalog,currentPatch:'p2'});
 assert.deepEqual(plan.candidates,['1.json']);assert.deepEqual(plan.keep,['0.json','2.json','3.json','4.json']);assert.equal(plan.dryRun,true);assert.equal(JSON.stringify(entries),before);
 assert.equal(retentionPlan(entries,{now,catalog,currentPatch:'p1'}).candidates.length,0);
 assert.equal(retentionPlan(entries,{now,catalog}).candidates.length,0);
});
test('patch controls: accessible state and unknown data fallback; marks match all hero keys without unapproved requests',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try {
  const panel=renderMetricHistory({scope:'compare',metric:'winRate',result:{points:[],segments:[]}});
  assert.equal(panel.querySelectorAll('[data-history-scope],[data-history-days]').length,0);
  assert.equal(panel.querySelector('h2').textContent,'승률 · 패치별 변화');assert(panel.textContent.includes('기록 수집 중'));
 }finally{globalThis.document=prior;dom.window.close();}
 validateSubroles();assert.equal(Object.keys(subroles.heroes).length,54);
 for(const row of Object.values(subroles.heroes)){const e=subroles.effects[row.subroleKey];assert.equal(e.mark.displayAllowed,false);assert.equal(e.mark.permission,'unverified');assert(e.mark.url.toLowerCase().endsWith(`/${row.subroleKey}.svg`));}
 const css=fs.readFileSync(new URL('../src/styles/detail.css',import.meta.url),'utf8');assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('box-shadow:inset 0 -2px 0 #f99e1a'));
});
test('public patch timeline: one latest real value per patch, unknown excluded and current patch marked ongoing',()=>{
 const rows=[snap('p1','2026-10-01T00:00:00Z',5),snap('p1','2026-10-02T00:00:00Z',7),snap('p2','2026-11-01T00:00:00Z',9),{...snap(null,'2026-11-02T00:00:00Z',99),patchVerification:null}];
 const result=buildPatchTimeline(rows,'genji',DEFAULT_FILTERS,{now,catalog,currentPatch:'p2'});
 assert.deepEqual(result.points.map(p=>p.value),[5,9]);assert.equal(result.points[1].ongoing,true);assert.equal(result.points[0].ongoing,false);
 assert.equal(result.segments.length,0);assert.equal(result.representativePolicy,'first-confirmed-after-day-one');
 assert.equal(buildPatchTimeline(rows.slice(0,2),'genji',DEFAULT_FILTERS,{now,catalog}).points.length,1);
});
