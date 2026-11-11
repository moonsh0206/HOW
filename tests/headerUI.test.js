import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {languagePicker} from '../src/i18n/languageView.js';
import {setLanguage} from '../src/i18n/i18n.js';
import {createMainMenuView} from '../src/views/mainMenuView.js';
test('header language uses shared combobox, preserves selection, keyboard navigation, storage and profile route',()=>{
 const dom=new JSDOM('<header class="site-header"></header>',{url:'https://example.com/HOW/en/player-search#/players/ID-1234'}),win=dom.window;let target;
 try{setLanguage('en');languagePicker({base:'/HOW/',model:{state:{}},window:{document:win.document,localStorage:win.localStorage,sessionStorage:win.sessionStorage,location:{...{pathname:win.location.pathname,hash:win.location.hash},assign:url=>target=url}}});
  const select=win.document.querySelector('select'),trigger=win.document.querySelector('[role=combobox]'),popup=win.document.querySelector('[role=listbox]');
  assert.equal(select.value,'en');assert(select.hidden);assert.equal(popup.querySelector('[aria-selected=true]').dataset.value,'en');assert.match(trigger.textContent,/English/);
  const key=value=>trigger.dispatchEvent(new win.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  key('Enter');assert.equal(trigger.getAttribute('aria-expanded'),'true');key('Escape');assert(popup.hidden);key(' ');key('Tab');assert(popup.hidden);
  key('ArrowUp');key('ArrowUp');key('Enter');assert.equal(select.value,'ko');assert.equal(win.localStorage.getItem('how:language:v1'),'ko');assert.equal(target,'/HOW/ko/player-search#/players/ID-1234');
 }finally{setLanguage('ko');win.close();}
});
test('desktop and mobile menu aria-current follows all routes, including hero details opened from meta',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),dom=new JSDOM(html),prior=globalThis.document;globalThis.document=dom.window.document;
 try{const view=createMainMenuView();for(const [route,expected]of [[{page:'list'},'list'],[{page:'detail',key:'genji'},'list'],[{page:'meta'},'meta'],[{page:'player-search'},'player-search'],[{page:'player',id:'ID-1234'},'player-search']]){
  view.render(route,'#/meta',true);assert.equal(document.querySelector('.main-menu [aria-current=page]').dataset.mainMenu,expected);
  const active=[...document.querySelectorAll('.site-header .desktop-header-link[aria-current=page]')];assert.equal(active.length,expected==='meta'?0:1);if(active.length)assert.equal(active[0].getAttribute('href'),expected==='list'?'#heroes':'#/player-search');
 }}finally{globalThis.document=prior;dom.window.close();}
});
