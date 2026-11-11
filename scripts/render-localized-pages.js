import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import ko from '../src/i18n/ko.js';
import en from '../src/i18n/en.js';
import {pagesBase} from './pages-base.js';
const base=pagesBase(process.env.VITE_BASE_PATH),origin=new URL(process.env.VITE_SITE_ORIGIN??'https://moonsh0206.github.io').origin;
const template=await readFile('dist/index.html','utf8');
const roster=JSON.parse(await readFile(new URL('../src/data/subroles.json',import.meta.url),'utf8'));
const heroNames=JSON.parse(await readFile(new URL('../src/data/patchHeroNames.json',import.meta.url),'utf8'));
const heroes=Object.keys(roster.heroes);
const paths=['tiers','meta','player-search',...heroes.flatMap(key=>[`heroes/${key}`,`heroes/${key}/overview`,`heroes/${key}/abilities`,`heroes/${key}/perks`])];
const entries=[];
for(const lang of ['ko','en'])for(const route of ['',...paths]){
 const dom=new JSDOM(template),doc=dom.window.document,dict=lang==='en'?en:ko;
 doc.documentElement.lang=lang;
 if(lang==='en'){
  const reverse=new Map(Object.entries(ko).filter(([,text])=>!text.includes('{')).map(([key,text])=>[text,key]));
  const walker=doc.createTreeWalker(doc.body,4);let text;
  while((text=walker.nextNode())){const source=text.textContent.trim(),key=reverse.get(source);if(key)text.textContent=text.textContent.replace(source,dict[key]);}
  for(const node of doc.querySelectorAll('[aria-label],[placeholder],[title]'))for(const attr of ['aria-label','placeholder','title']){const key=reverse.get(node.getAttribute(attr));if(key)node.setAttribute(attr,dict[key]);}
 }
 const hero=route.split('/')[1],ref=heroNames.find(h=>h.key===hero),name=route.startsWith('heroes/')?(lang==='en'?ref?.nameEn:ref?.name)??hero:dict[route==='meta'?'nav.meta':route==='player-search'?'nav.players':'nav.tiers'];
 const title=`${name} · HOW`,description=lang==='en'?`Explore ${name} with HOW, an unofficial Overwatch data hub.`:`HOW에서 ${name} 정보를 확인하세요. 비공식 오버워치 데이터 허브입니다.`;
 doc.title=title;doc.querySelector('meta[name=description]').content=description;
 const canonicalRoute=route||'tiers';
 for(const [rel,hreflang,path]of [['canonical',null,`${base}${lang}/${canonicalRoute}`],['alternate','ko',`${base}ko/${canonicalRoute}`],['alternate','en',`${base}en/${canonicalRoute}`]]){const link=doc.createElement('link');link.rel=rel;link.href=origin+path;if(hreflang)link.hreflang=hreflang;doc.head.append(link);}
 const noscript=doc.createElement('noscript');noscript.textContent=`${title}. ${description}`;doc.body.prepend(noscript);
 const directory=`dist/${lang}/${route}`;await mkdir(directory,{recursive:true});await writeFile(`${directory}/index.html`,dom.serialize());dom.window.close();entries.push(`${base}${lang}/${route}`);
}
const sitemap=paths.filter(p=>!p.endsWith('/overview')&&!p.endsWith('/abilities')&&!p.endsWith('/perks')).flatMap(route=>['ko','en'].map(lang=>`${origin}${base}${lang}/${route}`));
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemap.map(url=>`<url><loc>${url}</loc></url>`).join('')+'</urlset>');
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${origin}${base}sitemap.xml\n`);
await writeFile('dist/route-manifest.json',JSON.stringify({base,origin,entries},null,2));
console.log(`Generated ${entries.length} localized public entry points. Player profiles remain hash routes.`);
