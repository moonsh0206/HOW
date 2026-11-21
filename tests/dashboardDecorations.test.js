import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {dashboardDecoration} from '../src/views/dashboardDecorations.js';
import {dashboardPlayerSearch} from '../src/views/dashboardPlayerSearch.js';

test('supplied decorative assets have no accessible name or drag action; load failure hides only decoration',()=>{
 const dom=new JSDOM(),prior=globalThis.document;globalThis.document=dom.window.document;
 try{for(const kind of ['fishing','flame']){const image=dashboardDecoration(kind,'decoration');assert.equal(image.alt,'');assert.equal(image.getAttribute('aria-hidden'),'true');assert.equal(image.draggable,false);assert(image.getAttribute('src').startsWith('/assets/decorations/'));assert(image.src.endsWith('.webp'));image.dispatchEvent(new dom.window.Event('error'));assert.equal(image.hidden,true);}}finally{globalThis.document=prior;dom.window.close();}
});
test('search decoration does not change search validation, keyboard submission payload or translated controls',()=>{
 const dom=new JSDOM('<main></main>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{const {form,translate,setActive,destroy}=dashboardPlayerSearch();document.querySelector('main').append(form);translate();setActive(true);const input=form.querySelector('input'),button=form.querySelector('button'),queries=[];document.addEventListener('how:playersearch',event=>queries.push(event.detail.query));
  input.value='  TeKrop  ';form.requestSubmit(button);assert.deepEqual(queries,['TeKrop']);assert.equal(button.type,'submit');assert.equal(form.querySelectorAll('input').length,1);assert.equal(form.querySelectorAll('button').length,1);form.querySelector('img').dispatchEvent(new dom.window.Event('error'));assert.equal(input.disabled,false);
  input.value='   ';form.requestSubmit();assert.deepEqual(queries,['TeKrop']);assert.equal(input.value,'');assert.equal(document.activeElement,input);destroy();
 }finally{globalThis.document=prior;dom.window.close();}
});
