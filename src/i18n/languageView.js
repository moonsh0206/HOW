import {getLanguage,setLanguage,t,label,LANGUAGE_KEY,LANGUAGES,LANGUAGE_NAMES} from './i18n.js';
import {localizedURL,routeHash} from './routes.js';
import {createFilterCombobox} from '../views/filterCombobox.js';
const STATE_KEY='how:language-transfer:v1';
export function translateStatic(root=document){
 const walker=root.createTreeWalker?root.createTreeWalker(root.body,4):root.ownerDocument.createTreeWalker(root,4);
 let text;while((text=walker.nextNode())){if(text.parentElement?.closest('script,style,.header-language'))continue;const source=text.textContent.trim(),key=text.parentElement?.closest('[data-i18n]')?.dataset.i18n;text.textContent=text.textContent.replace(source,key?t(key):label(source));}
 for(const element of root.querySelectorAll('[aria-label],[title],[placeholder]'))for(const attr of ['aria-label','title','placeholder']){const source=element.getAttribute(attr),key=element.dataset.i18n;if(source)element.setAttribute(attr,key?t(key):label(source));}
}
export function languagePicker({model,base='/',window:win=window}){
 const container=win.document.createElement('div');container.className='header-language';const name=win.document.createElement('span');name.className='sr-only';name.textContent='Language';container.append(name);
 const select=win.document.createElement('select');select.id='header-language';select.className='language-picker';select.setAttribute('aria-label',t('language.label'));container.append(select);
 for(const value of LANGUAGES){const option=win.document.createElement('option');option.value=value;option.textContent=LANGUAGE_NAMES[value];select.append(option);}select.value=getLanguage();
 select.addEventListener('change',()=>{
  try{win.localStorage.setItem(LANGUAGE_KEY,select.value);}catch{}
  setLanguage(select.value);const target=new URL(localizedURL(routeHash(win.location,base),select.value,base),win.location.href);target.search=win.location.search;
  win.history.pushState(win.history.state,'',target.pathname+target.search+target.hash);
  win.document.documentElement.lang=getLanguage();win.document.dispatchEvent(new win.Event('how:languagechange'));
 });
 win.document.querySelector('.site-header').append(container);
 const combo=createFilterCombobox(select,{options:[...select.options].map(option=>({value:option.value,label:option.textContent})),displayLabel:()=> 'Language',icon:()=>{const svg=win.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','language-globe');svg.setAttribute('aria-hidden','true');svg.innerHTML='<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>';return svg;}});
 win.document.addEventListener('how:languagechange',()=>{select.value=getLanguage();select.setAttribute('aria-label',t('language.label'));combo.sync();});
}
export function readLanguageTransfer(storage){
 try{storage??=globalThis.sessionStorage;const raw=storage.getItem(STATE_KEY);storage.removeItem(STATE_KEY);const state=JSON.parse(raw);if(!state||Date.now()-state.createdAt>120000||Date.now()<state.createdAt)return null;return state;}catch{return null;}
}
