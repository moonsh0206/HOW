import {t} from '../i18n/i18n.js';
const grades=new Set(['S','A','B','C','D']);
// HOW tier decoration only. Ranking and eligibility remain in the domain model.
export function metaTierEmblem(tier,{decorative=true}={}){
 if(!grades.has(tier))throw Error('Unknown HOW tier');
 const mark=document.createElement('span');mark.className=`meta-tier-emblem tier-${tier.toLowerCase()}`;
 if(decorative)mark.setAttribute('aria-hidden','true');else{mark.setAttribute('role','img');mark.setAttribute('aria-label',`${t('티어')} ${tier}`);}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 36 40');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M4 2.5H32L30.5 25.5L18 37L5.5 25.5Z');path.setAttribute('class','meta-tier-shield');
 const letter=document.createElementNS(svg.namespaceURI,'text');letter.setAttribute('x','18');letter.setAttribute('y','25');letter.setAttribute('text-anchor','middle');letter.setAttribute('class','meta-tier-letter');letter.textContent=tier;
 svg.append(path,letter);mark.append(svg);return mark;
}
