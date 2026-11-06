import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {createFilterCombobox} from '../src/views/filterCombobox.js';
import {rankEmblem} from '../src/views/rankEmblem.js';
import {RANK_ASSETS,HOW_RANK_ARTWORK,createPngRankAssets} from '../src/data/rankAssets.js';
import {RANK_OPTIONS,mapDropdownOptions,MAP_MODE_LABELS} from '../src/views/filterOptions.js';
import {MAP_KEYS} from '../src/models/mapModel.js';
import {DEFAULT_FILTERS,DIVISION_GROUPS} from '../src/models/statisticsModel.js';
import {createHeroView} from '../src/views/heroView.js';
import {createHeroModel} from '../src/models/heroModel.js';
function setup(html){const dom=new JSDOM(html,{url:'https://example.test/HOW/'}),old=globalThis.document;globalThis.document=dom.window.document;return {dom,close(){globalThis.document=old;dom.window.close();}};}
test('rank options preserve 16 values, eight configured PNG paths and seven plus overlays',()=>{
 const app=setup('<body>');try{
  assert.deepEqual(new Set(RANK_OPTIONS.map(o=>o.value)),new Set(DIVISION_GROUPS.flatMap(g=>g.keys)));assert.equal(RANK_OPTIONS.length,16);assert.equal(RANK_OPTIONS[0].value,'all');assert(!RANK_OPTIONS.some(o=>o.value==='challenger'));
  assert.deepEqual(RANK_OPTIONS.slice(1,7).map(o=>o.value),['grandmaster','master_plus','master','diamond_plus','diamond','emerald_plus']);
  for(const option of RANK_OPTIONS){const el=rankEmblem(option.value);assert.equal(el.querySelector('svg'),null);assert.equal(Boolean(el.querySelector('img')),option.value!=='all');assert.equal(el.classList.contains('rank-emblem--fallback'),option.value==='all');assert.equal(el.querySelectorAll('.rank-plus').length,Number(option.value.endsWith('_plus')));assert.equal(el.getAttribute('aria-hidden'),'true');if(option.value!=='all')assert.equal(el.dataset.artwork,'user-local');}
  assert.equal(Object.keys(RANK_ASSETS).length,8);assert.equal(RANK_ASSETS.emerald.status,'configured');assert(RANK_ASSETS.emerald.assetUrl.endsWith('/emerald.png'));assert(!Object.hasOwn(RANK_ASSETS,'champion'));assert(!Object.hasOwn(RANK_ASSETS,'challenger'));assert(!Object.hasOwn(RANK_ASSETS,'all'));
 }finally{app.close();}
});
test('reviewed local rank image pipeline: shared base asset, original colors, image error fallback, no CDN',()=>{
 const app=setup('<body>');try{
  // Synthetic asset registry tests the rendering contract only; no fake official art is shipped.
  const assets={diamond:{status:'verified',currentVersionStatus:'verified',permissionStatus:'confirmed',assetUrl:'/HOW/assets/fixture-diamond.png'}};
  const plain=rankEmblem('diamond',{assets}),plus=rankEmblem('diamond_plus',{assets});assert.equal(plain.querySelector('img').getAttribute('src'),plus.querySelector('img').getAttribute('src'));assert.equal(plus.querySelector('img').alt,'');assert.equal(plus.querySelector('img').style.filter,'');assert.equal(plus.querySelectorAll('.rank-plus').length,1);
  plus.querySelector('img').dispatchEvent(new app.dom.window.Event('error'));assert.equal(plus.querySelector('img'),null);assert(plus.classList.contains('rank-emblem--fallback'));assert(plus.querySelector('.rank-plus'));
  for(const assetUrl of ['https://static.playoverwatch.com/example.png','//example.test/icon.png'])assert.equal(rankEmblem('diamond',{assets:{diamond:{...assets.diamond,assetUrl}}}).querySelector('img'),null);
  assert.equal(rankEmblem('diamond',{assets:{diamond:{...assets.diamond,permissionStatus:'unconfirmed'}}}).querySelector('img'),null);
  assert.equal(rankEmblem('diamond',{assets:{diamond:{...assets.diamond,currentVersionStatus:'unverified'}}}).querySelector('img'),null);
  const trigger=document.createElement('button');trigger.append(plus,document.createTextNode('다이아몬드 이상'));assert(trigger.textContent.includes('다이아몬드 이상'));assert.equal(rankEmblem('all').querySelector('img'),null);
 }finally{app.close();}
});
test('rank optical size is an explicit bounded uniform scale; pending assets never render',()=>{
 const app=setup('<body>');try{
  const descriptor={status:'verified',currentVersionStatus:'verified',permissionStatus:'confirmed',assetUrl:'/HOW/assets/test-only.png',opticalScale:1.2};
  const assets={emerald:descriptor};const plain=rankEmblem('emerald',{assets}),plus=rankEmblem('emerald_plus',{assets});
  assert.equal(plain.style.getPropertyValue('--rank-optical-scale'),'1.2');assert.equal(plus.style.getPropertyValue('--rank-optical-scale'),'1.2');assert.equal(plain.querySelector('img').getAttribute('src'),plus.querySelector('img').getAttribute('src'));
  for(const opticalScale of [0,NaN,Infinity,20,'1.2'])assert.equal(rankEmblem('emerald',{assets:{emerald:{...descriptor,opticalScale}}}).style.getPropertyValue('--rank-optical-scale'),'');
  plus.querySelector('img').dispatchEvent(new app.dom.window.Event('error'));assert.equal(plus.style.getPropertyValue('--rank-optical-scale'),'');assert(plus.classList.contains('rank-emblem--fallback'));
  for(const asset of Object.values(RANK_ASSETS)){assert.equal(asset.currentVersionStatus,'user-supplied');assert.equal(asset.permissionStatus,'user-authorized');assert.equal(asset.format,'png');assert(asset.opticalScale>=.75&&asset.opticalScale<=1.5);}
 }finally{app.close();}
});
test('user PNG files: eight real files match measured dimensions/hash, reference champion excluded',async()=>{
 const app=setup('<body>');try{
  for(const [key,asset]of Object.entries(RANK_ASSETS)){
   const bytes=await readFile(new URL(`../public/assets/ranks/${key}.png`,import.meta.url));
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),asset.width);assert.equal(bytes.readUInt32BE(20),asset.height);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert(asset.assetUrl.endsWith(`/assets/ranks/${key}.png`));const normal=rankEmblem(key);normal.querySelector('img').dispatchEvent(new app.dom.window.Event('error'));assert(normal.classList.contains('rank-emblem--fallback'));
  }
  assert(!Object.hasOwn(RANK_ASSETS,'champion'));assert(!RANK_OPTIONS.some(o=>o.value==='champion'));
 }finally{app.close();}
});
test('PNG base paths: root, Pages and nested repository base preserve exact names without champion filter',()=>{
 for(const base of ['/','/HOW/','/preview/HOW/'])for(const [key,asset]of Object.entries(createPngRankAssets(base)))assert.equal(asset.assetUrl,`${base}assets/ranks/${key}.png`);
 for(const base of ['//external/','https://example.test/','/HOW','/../'])assert.throws(()=>createPngRankAssets(base));
 const app=setup('<body>');try{for(const [key,asset]of Object.entries(RANK_ASSETS)){if(key==='grandmaster')continue;const normal=rankEmblem(key),plus=rankEmblem(`${key}_plus`);assert.equal(normal.querySelector('img').getAttribute('src'),plus.querySelector('img').getAttribute('src'));assert(plus.querySelector('.rank-plus'));assert.equal(asset.format,'png');}}finally{app.close();}
});
test('eight HOW SVG files: consistent canvas, independent geometry, no external content and all base/plus images',async()=>{
 const app=setup('<body>'),silhouettes=new Set();try{
  for(const [key,asset]of Object.entries(HOW_RANK_ARTWORK)){
   const text=await readFile(new URL(`../public/assets/ranks/${key}.svg`,import.meta.url),'utf8'),xml=new app.dom.window.DOMParser().parseFromString(text,'image/svg+xml');assert.equal(xml.querySelector('parsererror'),null);assert.equal(xml.documentElement.getAttribute('viewBox'),'0 0 96 96');assert.equal(xml.querySelector('script,image,foreignObject'),null);assert(xml.querySelector('title').textContent.includes('unofficial'));assert(xml.querySelector('linearGradient'));assert(xml.querySelectorAll('path').length>=6);silhouettes.add(xml.querySelector('path').getAttribute('d'));assert.equal(asset.kind,'how-original');assert.equal(asset.sourceUrl,null);
   const icon=rankEmblem(key,{assets:HOW_RANK_ARTWORK});assert(icon.querySelector('img').getAttribute('src').endsWith(`/${key}.svg`));if(key!=='grandmaster'){const plus=rankEmblem(`${key}_plus`,{assets:HOW_RANK_ARTWORK});assert.equal(plus.querySelector('img').getAttribute('src'),icon.querySelector('img').getAttribute('src'));assert.equal(plus.querySelectorAll('.rank-plus').length,1);}
  }
  assert.equal(silhouettes.size,8);assert.equal(rankEmblem('all').querySelector('img'),null);
  assert.equal(rankEmblem('diamond',{assets:{diamond:{...RANK_ASSETS.diamond,permissionStatus:'unconfirmed'}}}).querySelector('img'),null);
 }finally{app.close();}
});
test('combobox: pointer selection, pressed selection, arrows, Escape/Tab, outside close, disabled, value bridge',()=>{
 const app=setup('<label>등급<select id="rank" data-stats-filter="division"></select></label><button id="outside">다음</button>');try{
  const {document,KeyboardEvent,Event,MouseEvent}=app.dom.window,select=document.querySelector('select');for(const o of RANK_OPTIONS){const el=document.createElement('option');el.value=o.value;el.textContent=o.label;select.append(el);}select.value=DEFAULT_FILTERS.division;
  const combo=createFilterCombobox(select,{options:RANK_OPTIONS,icon:rankEmblem}),trigger=document.querySelector('[role=combobox]'),list=document.querySelector('[role=listbox]');let changes=0;select.addEventListener('change',()=>changes++);
  const key=k=>trigger.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));trigger.focus();key(' ');assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(trigger.getAttribute('aria-controls'),list.id);assert.equal(document.activeElement,trigger);assert.equal(document.getElementById(trigger.getAttribute('aria-activedescendant')).dataset.value,'diamond_plus');
  key('ArrowDown');key('Enter');assert.equal(select.value,'diamond');assert.equal(changes,1);assert.equal(trigger.getAttribute('aria-expanded'),'false');assert(trigger.textContent.includes('다이아몬드'));assert.equal(list.querySelector('[aria-selected=true]').dataset.value,'diamond');
  trigger.click();key('Home');key('Enter');assert.equal(select.value,'all');trigger.click();key('End');key(' ');assert.equal(select.value,'bronze');
  trigger.click();key('Escape');assert(list.hidden);assert.equal(document.activeElement,trigger);trigger.click();key('Tab');assert(list.hidden);
  trigger.click();document.querySelector('#outside').dispatchEvent(new MouseEvent('pointerdown',{bubbles:true}));assert(list.hidden);
  trigger.click();list.querySelector('[data-value=master_plus]').click();assert.equal(select.value,'master_plus');assert.equal(changes,4);
  select.value='gold';select.dispatchEvent(new Event('change',{bubbles:true}));assert(trigger.textContent.includes('골드'));select.disabled=true;combo.sync();assert(trigger.disabled);trigger.click();assert(list.hidden);
 }finally{app.close();}
});
test('map grouping reuses actual standard modes with no invented maps, headers unselectable',()=>{
 const choices=mapDropdownOptions([...MAP_KEYS].map(key=>({key})));assert.equal(choices.length,MAP_KEYS.size+1);assert.equal(new Set(choices.map(o=>o.value)).size,choices.length);assert.deepEqual(new Set(choices.filter(o=>o.group).map(o=>o.group)),new Set(Object.values(MAP_MODE_LABELS)));assert.equal(choices.find(o=>o.value==='busan').group,'쟁탈');assert.equal(choices.find(o=>o.value==='kings-row').group,'하이브리드');assert.equal(choices.find(o=>o.value==='aatlis').group,'플래시포인트');
 const app=setup('<label>전장<select id="map"></select></label>');try{const select=document.querySelector('select');createFilterCombobox(select,{options:choices});assert.equal(document.querySelectorAll('[role=option]').length,choices.length);assert.equal(document.querySelectorAll('[role=group]').length,5);assert([...document.querySelectorAll('.filter-option-group')].every(h=>!h.hasAttribute('tabindex')&&h.getAttribute('role')!=='option'));}finally{app.close();}
});
test('hero view: hidden bridge and visible combobox stay synchronized through mode/map and detail reparenting',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),app=setup(html);try{
  const view=createHeroView(),model=createHeroModel();view.render(model);const rank=document.querySelector('#stats-division-trigger'),map=document.querySelector('#stats-map-trigger');assert(rank.textContent.includes('다이아몬드 이상'));assert(rank.querySelector('.rank-plus'));assert.equal(document.querySelector('#stats-division').hidden,true);
  assert.equal(document.querySelectorAll('#statistics-filters [role=combobox]').length,4);
  const region=document.querySelector('#stats-region-trigger'),mode=document.querySelector('#stats-mode-trigger'),events=[];
  document.querySelector('#statistics-filters').addEventListener('change',event=>events.push([event.target.dataset.statsFilter,event.target.value]));
  assert(region.textContent.includes('아시아'));assert(mode.textContent.includes('경쟁전'));
  region.click();document.querySelector('#stats-region-listbox [data-value=europe]').click();assert.deepEqual(events.at(-1),['region','europe']);assert(region.textContent.includes('유럽'));
  mode.click();document.querySelector('#stats-mode-listbox [data-value=quickplay]').click();assert.deepEqual(events.at(-1),['gamemode','quickplay']);assert(mode.textContent.includes('빠른 대전'));
  const host=document.createElement('div');document.body.append(host);host.append(document.querySelector('#statistics-filters'));rank.click();document.querySelector('#stats-division-listbox [data-value=master_plus]').click();assert.equal(document.querySelector('#stats-division').value,'master_plus');
  model.state.statsFilters={...DEFAULT_FILTERS,division:'all',gamemode:'quickplay',map:'busan'};view.render(model);assert(rank.disabled);assert(map.textContent.includes('부산'));view.setMaps([{key:'busan'},{key:'kings-row'}],'busan');assert.equal(document.querySelectorAll('#stats-map-listbox [role=option]').length,3);assert(map.textContent.includes('부산'));assert.equal(document.querySelectorAll('#stats-map').length,1);
  assert(mode.textContent.includes('빠른 대전'));assert(region.textContent.includes('아시아'));
  model.state.statsFilters={...DEFAULT_FILTERS};view.render(model);assert.equal(rank.disabled,false);assert.equal(rank.getAttribute('aria-expanded'),'false');assert(rank.textContent.includes('다이아몬드 이상'));
  assert(mode.textContent.includes('경쟁전'));assert(region.textContent.includes('아시아'));
 }finally{app.close();}
});
