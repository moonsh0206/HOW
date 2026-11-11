import ko from './ko.js';
import {getLanguage,t,label,LANGUAGE_KEY} from './i18n.js';
import {localizedURL,routeHash} from './routes.js';
import {createFilterCombobox} from '../views/filterCombobox.js';
const STATE_KEY='how:language-transfer:v1';
const reverse=new Map(Object.entries(ko).filter(([,text])=>!text.includes('{')).map(([key,text])=>[text,key]));
export function translateStatic(root=document){
 const walker=root.createTreeWalker?root.createTreeWalker(root.body,4):root.ownerDocument.createTreeWalker(root,4);
 let text;while((text=walker.nextNode())){const source=text.textContent.trim();if(reverse.has(source))text.textContent=text.textContent.replace(source,t(reverse.get(source)));}
 for(const element of root.querySelectorAll('[aria-label],[title],[placeholder]'))for(const attr of ['aria-label','title','placeholder']){const source=element.getAttribute(attr);if(reverse.has(source))element.setAttribute(attr,t(reverse.get(source)));}
}
export function languagePicker({model,base='/',window:win=window}){
 const container=win.document.createElement('div');container.className='header-language';const name=win.document.createElement('span');name.className='sr-only';name.textContent=t('language.label');container.append(name);
 const select=win.document.createElement('select');select.id='header-language';select.className='language-picker';select.setAttribute('aria-label',t('language.label'));container.append(select);
 for(const [value,text]of [['ko','한국어'],['en','English']]){const option=win.document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=getLanguage();
 select.addEventListener('change',()=>{
  try{win.localStorage.setItem(LANGUAGE_KEY,select.value);}catch{}
  const {statsFilters,query,role,sort,favoritesOnly,statistics,statsStatus,previousSnapshot,snapshotStatus}=model.state;
  try{win.sessionStorage.setItem(STATE_KEY,JSON.stringify({createdAt:Date.now(),statsFilters,query,role,sort,favoritesOnly,statistics,statsStatus,previousSnapshot,snapshotStatus}));}catch{}
  win.location.assign(localizedURL(routeHash(win.location,base),select.value,base));
 });
 win.document.querySelector('.site-header').append(container);
 createFilterCombobox(select,{options:[...select.options].map(option=>({value:option.value,label:option.textContent}))});
}
export function readLanguageTransfer(storage){
 try{storage??=globalThis.sessionStorage;const raw=storage.getItem(STATE_KEY);storage.removeItem(STATE_KEY);const state=JSON.parse(raw);if(!state||Date.now()-state.createdAt>120000||Date.now()<state.createdAt)return null;return state;}catch{return null;}
}
