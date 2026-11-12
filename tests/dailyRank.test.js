import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyRankChanges,rankDay,RANK_POLICY_ID} from '../src/models/dailyRankModel.js';
import {createHeroModel} from '../src/models/heroModel.js';
import {DEFAULT_FILTERS} from '../src/models/statisticsModel.js';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createHeroView} from '../src/views/heroView.js';
import {setLanguage} from '../src/i18n/i18n.js';
import {expandSnapshotFile} from '../src/models/snapshotV2Model.js';
import {combineDivisionHistory} from '../src/models/compositeHistoryModel.js';
const heroes=['a','b','c'].map(key=>({key,name:key,role:'damage'}));
const filters={...DEFAULT_FILTERS,division:'diamond'};
const records=order=>order.map((hero,i)=>({hero,winRate:60-i*5,pickRate:20-i*5,banRate:10-i*3}));
const frame=(time,order)=>({collectedAt:time,rankPolicyId:RANK_POLICY_ID,rankRoster:{a:'damage',b:'damage',c:'damage'},filters,patch:null,statisticsWindow:'unverified-patch-window',records:records(order)});
const previous=frame('2026-11-11T01:02:00.000Z',['c','b','a']);
const current=frame('2026-11-12T01:03:00.000Z',['a','b','c']);
const args={heroes,filters,role:'damage',now:'2026-11-12T04:00:00.000Z',snapshots:[previous,current]};
test('daily stored ranks: +2, -2, unchanged; first observation and 10 KST boundary',()=>{
 const result=dailyRankChanges(args);assert.equal(result.get('a').delta,2);assert.equal(result.get('c').delta,-2);assert.equal(result.get('b').delta,0);
 assert.equal(rankDay('2026-11-12T00:59:59.000Z'),'2026-11-11');assert.equal(rankDay('2026-11-12T01:00:00.000Z'),'2026-11-12');
 assert.equal(dailyRankChanges({...args,snapshots:[previous,current,frame('2026-11-12T02:00:00.000Z',['c','b','a'])]}).get('a').delta,2);
});
test('missing, old, mismatched, quality-review and changed policy/role records suppress deltas',()=>{
 for(const snapshots of [[current],[{...previous,collectedAt:'2026-11-10T01:02:00.000Z'},current],[{...previous,rankPolicyId:'old'},current],[{...previous,filters:{...filters,region:'europe'}},current],[{...previous,records:previous.records.slice(1)},current],[{...previous,rankRoster:{a:'tank',b:'damage',c:'damage'}},current],[{...previous,records:previous.records.map(r=>({...r,winRate:0}))},current]])assert.equal(dailyRankChanges({...args,snapshots}).size,0);
});
test('list eligibility: role and tier sort only; search preserves movement ordinal',()=>{
 const model=createHeroModel();Object.assign(model.state,{heroes,statistics:{filters,records:current.records},statsFilters:filters,dailyRankSnapshots:args.snapshots});
 assert.equal(model.listSelection().changes.size,0);model.state.role='damage';assert.equal(model.listSelection().changes.size,3);
 for(const sort of ['meta-desc','winrate-desc','pickrate-desc','banrate-desc','name-asc']){model.state.sort=sort;assert.equal(model.listSelection().changes.size,0);}
 model.state.sort='tier-desc';model.state.query='a';assert.equal(model.listSelection().ordinals.get('a'),1);assert.equal(model.listSelection().changes.get('a').delta,2);
});
test('daily schedule remains inactive with one 01 UTC cron and no write permission',async()=>{
 const text=await readFile(new URL('../docs/proposals/daily-rank-snapshots.yml.example',import.meta.url),'utf8');assert.equal((text.match(/cron:/g)||[]).length,1);assert.match(text,/0 1 \* \* \*/);assert.match(text,/contents: read/);assert.doesNotMatch(text,/git push|git commit/);
});
test('existing grouped archive restores policy metadata into original and cumulative cohorts without modifying files',async()=>{
 const root=new URL('../public/data/snapshots/',import.meta.url);
 const index=JSON.parse(await readFile(new URL('index.json',root),'utf8'));
 const entry=index.snapshots.find(e=>e.schemaVersion===2);
 assert.ok(entry);
 const raw=JSON.parse(await readFile(new URL(entry.file,root),'utf8'));
 const roster=JSON.parse(await readFile(new URL('../src/data/subroles.json',import.meta.url),'utf8'));
 raw.rankPolicyId=RANK_POLICY_ID;raw.rankRoster=Object.fromEntries(Object.entries(roster.heroes).map(([key,row])=>[key,row.parentRole]));
 const restored=expandSnapshotFile(raw);assert.ok(restored.length);
 for(const snapshot of restored){assert.equal(snapshot.rankPolicyId,RANK_POLICY_ID);assert.deepEqual(snapshot.rankRoster,raw.rankRoster);}
 const combined=combineDivisionHistory(restored,{...restored[0].filters,division:'diamond_plus'});
 assert.ok(combined.length);assert.equal(combined[0].rankPolicyId,RANK_POLICY_ID);assert.deepEqual(combined[0].rankRoster,raw.rankRoster);
});
test('PC and mobile share movement, translated tooltip, and other sorts hide it',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://example.org/HOW/'}),saved={document:globalThis.document,window:globalThis.window,location:globalThis.location};
 Object.assign(globalThis,{document:dom.window.document,window:dom.window,location:dom.window.location});
 try{
  const model=createHeroModel();Object.assign(model.state,{status:'ready',statsStatus:'ready',heroes,statistics:{filters,records:current.records},statsFilters:filters,role:'damage'});
  // Use current reporting days rather than a fixed wall clock in View integration.
  const day=new Date().toISOString();const start=rankDay(day);
  model.state.dailyRankSnapshots=[{...previous,collectedAt:new Date(Date.parse(start+'T01:00:00Z')-86400000).toISOString()},{...current,collectedAt:start+'T01:00:00.000Z'}];
  const view=createHeroView();
  for(const lang of ['ko','en']){setLanguage(lang);view.render(model);const pc=[...document.querySelectorAll('#hero-rows .rank-change')],mobile=[...document.querySelectorAll('#hero-cards .rank-change')];assert.deepEqual(pc.map(n=>n.textContent),['▲2','=','▼2']);assert.deepEqual(mobile.map(n=>n.textContent),pc.map(n=>n.textContent));assert.match(pc[0].title,/10:00 KST/);}
  model.state.sort='meta-desc';view.render(model);assert.equal(document.querySelectorAll('.rank-change').length,0);
 }finally{setLanguage('ko');dom.window.close();Object.assign(globalThis,saved);}
});
