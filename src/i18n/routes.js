import {getLanguage} from './i18n.js';
export function routeHash(location,base='/'){
 if(location.hash&&location.hash!=='#')return location.hash;
 const path=(location.pathname.startsWith(base)?location.pathname.slice(base.length):'').replace(/\/index\.html$/,'/').replace(/\/$/,'');
 const match=/^(ko|en)(?:\/(.*))?$/.exec(path);
 return match&&match[2]?'#/'+match[2]:'#/tiers';
}
export function localizedURL(hash,language,base='/'){
 if(!['ko','en'].includes(language)||!base.startsWith('/')||!base.endsWith('/')||base.startsWith('//'))throw Error('Invalid localized route');
 const route=hash.replace(/^#\/?/,'');
 if(/^players\//.test(route))return `${base}${language}/player-search#/${route}`;
 if(['heroes','favorites'].includes(route))return `${base}${language}/tiers#${route}`;
 if(route&&!/^(tiers|meta|player-search)$/.test(route)&&!/^heroes\/[a-z0-9-]+(?:\/(overview|abilities|perks))?$/.test(route))return `${base}${language}/tiers#/${route}`;
 const path=route||'tiers';
 return `${base}${language}/${path}`;
}
export function installLocalizedNavigation({base='/',window:win=window}={}){
 const normalize=()=>{
  const hash=routeHash(win.location,base),target=localizedURL(hash,getLanguage(),base);
  if(win.location.pathname+win.location.hash!==target)win.history.replaceState(win.history.state,'',(()=>{const url=new URL(target,win.location.href);url.search=win.location.search;return url.pathname+url.search+url.hash;})());
 };
 const click=event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest('a[href^="#"]');if(!anchor||anchor.target||anchor.hasAttribute('download')||anchor.dataset.playerId)return;
  const hash=anchor.getAttribute('href');if(!['#','#heroes','#favorites'].includes(hash)&&!hash.startsWith('#/'))return;
  event.preventDefault();win.queueMicrotask(()=>{win.history.pushState(null,'',localizedURL(hash,getLanguage(),base));win.dispatchEvent(new win.HashChangeEvent('hashchange'));});
 };
 const pop=()=>win.dispatchEvent(new win.HashChangeEvent('hashchange'));
 normalize();win.addEventListener('hashchange',normalize);win.addEventListener('popstate',pop);win.document.addEventListener('click',click);
 return ()=>{win.removeEventListener('hashchange',normalize);win.removeEventListener('popstate',pop);win.document.removeEventListener('click',click);};
}
