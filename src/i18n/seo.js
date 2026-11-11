import {getLanguage,t} from './i18n.js';
import {localizedURL} from './routes.js';
export function updateSEO(route,model,{document:doc=document,base=import.meta.env?.BASE_URL??'/',origin=import.meta.env?.VITE_SITE_ORIGIN??'https://moonsh0206.github.io'}={}){
 const lang=getLanguage(),privatePage=route.page==='player';
 doc.documentElement.lang=lang;
 const name=route.page==='detail'?(model?.heroByKey(route.key)?.name??route.key):t(route.page==='meta'?'nav.meta':['player','player-search'].includes(route.page)?'nav.players':'nav.tiers');
 doc.title=`${name} · HOW`;
 let robots=doc.querySelector('meta[name=robots]');if(!robots){robots=doc.createElement('meta');robots.name='robots';doc.head.append(robots);}robots.content=privatePage?'noindex, nofollow':'index, follow';
 const hash=route.page==='detail'?`#/heroes/${route.key}${route.tab&&route.tab!=='overview'?'/'+route.tab:''}`:route.page==='meta'?'#/meta':['player','player-search'].includes(route.page)?'#/player-search':'#/tiers';
 let description=doc.querySelector('meta[name=description]');if(!description){description=doc.createElement('meta');description.name='description';doc.head.append(description);}description.content=lang==='en'?`${name} · HOW, an unofficial Overwatch data hub.`:`${name} · 비공식 오버워치 데이터 허브 HOW.`;
 for(const [rel,hreflang,language]of [['canonical',null,lang],['alternate','ko','ko'],['alternate','en','en']]){const selector=hreflang?`link[rel=alternate][hreflang=${hreflang}]`:'link[rel=canonical]';let link=doc.querySelector(selector);if(!link){link=doc.createElement('link');link.rel=rel;if(hreflang)link.hreflang=hreflang;doc.head.append(link);}link.href=new URL(localizedURL(hash,language,base),origin).href;}
}
