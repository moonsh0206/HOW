import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {syncCompactMain} from '../src/views/compactMainView.js';
import {renderPatchNote,setPatchNoteMobile} from '../src/views/patchNoteView.js';

test('compact main relocates existing filters and preserves values, listeners, open state and source information',()=>{
 const dom=new JSDOM(`<section id="heroes"><section class="cohort-banner"><p id="active-cohort-freshness">source timestamp</p><div id="statistics-filters"><label>region<select id="stats-region"></select></label><label>division<select id="stats-division"></select></label><label>mode<select id="stats-mode"><option value="competitive">경쟁전</option><option value="quickplay">빠른 대전</option></select></label><label>map<select id="stats-map"><option value="all">전체 전장</option><option value="busan">부산</option></select></label></div></section><div class="statistics-notice"><p id="stats-status" data-state="ready">quality notice</p></div></section><div id="detail-filter-host"></div>`);
 const doc=dom.window.document,root=doc.querySelector('#statistics-filters'),map=doc.querySelector('#stats-map');let changes=0;map.addEventListener('change',()=>changes++);
 Object.defineProperty(dom.window,'innerWidth',{value:390,writable:true});syncCompactMain(root);
 assert.equal(root.querySelector('.compact-advanced').open,false);assert.equal(root.querySelectorAll(':scope>label').length,2);
 assert.equal(doc.querySelector('.compact-source #active-cohort-freshness').textContent,'source timestamp');
 map.value='busan';map.dispatchEvent(new dom.window.Event('change'));syncCompactMain(root);assert.equal(changes,1);assert.match(root.querySelector('summary').textContent,/부산/);
 const extra=root.querySelector('details');extra.open=true;extra.dispatchEvent(new dom.window.Event('toggle'));
 dom.window.innerWidth=1440;syncCompactMain(root);assert.equal(root.querySelectorAll(':scope>label').length,4);assert.equal(doc.querySelector('.compact-source'),null);assert.equal(doc.querySelector('#stats-map'),map);
 dom.window.innerWidth=390;syncCompactMain(root);assert.equal(root.querySelector('details').open,true);
 doc.querySelector('#detail-filter-host').append(root);syncCompactMain(root);assert.equal(root.querySelectorAll(':scope>label').length,4);assert.equal(map.value,'busan');
 dom.window.close();
});

test('mobile patch disclosure preserves full summary and restores desktop order',()=>{
 const dom=new JSDOM();global.document=dom.window.document;
 try{const card=renderPatchNote({dateKo:'2026-11-06',label:'note',summary:'full summary',changes:['change'],sourceUrl:'https://overwatch.blizzard.com/'});document.body.append(card);
 setPatchNoteMobile(card,true);assert.equal(card.querySelector('details .patch-note-summary').textContent,'full summary');card.querySelector('details').open=true;
 setPatchNoteMobile(card,false);assert.equal(card.querySelector(':scope>.patch-note-summary').textContent,'full summary');assert.equal(card.querySelector('details').open,true);assert.equal(card.querySelectorAll('a').length,1);
 }finally{delete global.document;dom.window.close();}
});

test('dashboard reuses two primary filters; advanced state, applied summary, focus, source location and desktop controls survive route changes',()=>{
 const dom=new JSDOM('<section id="heroes"><p id="active-cohort-freshness">timestamp</p><div class="statistics-notice">source</div><div id="statistics-filters"><label>region<select id="stats-region"></select></label><label>rank<select id="stats-division"></select></label><label>mode<select id="stats-mode"><option value="competitive">competitive</option><option value="quickplay">quickplay</option></select></label><label>map<select id="stats-map"><option value="all">all</option><option value="busan">Busan</option></select></label></div></section><div id="dashboard-filter-host"></div>');
 const doc=dom.window.document,root=doc.querySelector('#statistics-filters'),map=doc.querySelector('#stats-map'),notice=doc.querySelector('.statistics-notice');Object.defineProperty(dom.window,'innerWidth',{value:390,writable:true});
 doc.querySelector('#dashboard-filter-host').append(root);syncCompactMain(root);const details=root.querySelector('.compact-advanced'),summary=details.querySelector('summary');assert.equal(details.open,false);assert.equal(summary.getAttribute('aria-expanded'),'false');assert.equal(root.querySelectorAll(':scope>label').length,2);assert.equal(notice.parentElement.id,'heroes');assert.equal(summary.getAttribute('aria-controls'),details.querySelector('div').id);
 details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));map.value='busan';syncCompactMain(root);assert.match(summary.textContent,/Busan/);assert.equal(summary.getAttribute('aria-expanded'),'true');assert.equal(doc.querySelectorAll('#stats-map').length,1);
 map.focus();details.open=false;details.dispatchEvent(new dom.window.Event('toggle'));assert.equal(doc.activeElement,summary);assert.equal(summary.getAttribute('aria-expanded'),'false');
 doc.querySelector('#heroes').append(root);syncCompactMain(root);assert.equal(root.querySelector('details'),details);assert(doc.querySelector('.compact-source').contains(notice));doc.querySelector('#dashboard-filter-host').append(root);syncCompactMain(root);assert.equal(notice.parentElement.id,'heroes');assert.equal(details.open,false);
 details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));dom.window.innerWidth=1440;syncCompactMain(root);assert.equal(root.querySelectorAll(':scope>label').length,4);assert.equal(root.querySelector('details'),null);assert.equal(doc.querySelector('#stats-map'),map);assert.equal(map.value,'busan');dom.window.innerWidth=390;syncCompactMain(root);assert(details.open);dom.window.close();
});
