import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {compactText} from '../src/views/compactText.js';

test('mobile text disclosure preserves full text, keyboard button semantics and independent state',()=>{
 const dom=new JSDOM('<body></body>'),prior=globalThis.document;globalThis.document=dom.window.document;
 try{
  const text='긴 영웅 설명입니다. '.repeat(12)+'<script>unsafe()</script>',intro=compactText(text,'detail-description'),other=compactText(text,'patch-summary');
  document.body.append(intro,other);const button=intro.querySelector('button');
  assert.equal(button.type,'button');assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(intro.querySelector('p').textContent,text);assert.equal(intro.querySelector('script'),null);
  button.focus();button.click();assert.equal(button.getAttribute('aria-expanded'),'true');assert(intro.classList.contains('text-expanded'));assert.equal(document.activeElement,button);assert.equal(other.querySelector('button').getAttribute('aria-expanded'),'false');
  button.click();assert.equal(button.textContent,'더보기');assert.equal(intro.querySelector('p').textContent,text);
  assert.equal(compactText('짧은 설명','detail-description').querySelector('button'),null);
 }finally{globalThis.document=prior;dom.window.close();}
});
