import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
test('facet alpha masks are distinct sparse planes, without tiles, illustrations or SVG animation',()=>{
 const signatures=new Set();
 for(const role of ['tank','damage','support','spotlight','heading']){
  const source=fs.readFileSync(`src/assets/hologram/facets-${role}.svg`,'utf8'),dom=new JSDOM(source,{contentType:'image/svg+xml'}),doc=dom.window.document;
  assert.equal(doc.querySelector('parsererror'),null);assert.equal(doc.querySelectorAll('polygon').length,2);assert.equal(doc.querySelector('pattern,image,text,script,animate,animateTransform'),null);assert.equal(doc.querySelectorAll('linearGradient').length,2);assert(parseFloat(doc.querySelector('feGaussianBlur').getAttribute('stdDeviation'))<=1);const points=[...doc.querySelectorAll('polygon')].map(e=>e.getAttribute('points')).join('|');assert(!signatures.has(points));signatures.add(points);dom.window.close();
 }
});
