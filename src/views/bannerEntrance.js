import {createHeaderEntrance} from './headerEntrance.js';
// Existing five-part banner stagger; only preparation/playback timing is shared.
export function createBannerEntrance(banner,win=window){
 function targets(){
  const title=banner?.querySelector('h1');
  if(title&&!title.querySelector('.banner-title-first')){
   const text=[...title.childNodes].find(node=>node.nodeType===3&&node.textContent.trim());
   if(text){const span=title.ownerDocument.createElement('span');span.className='banner-title-first';text.replaceWith(span);span.append(text);}
  }
  return banner?[banner.querySelector('.eyebrow'),title?.querySelector('.banner-title-first'),title?.querySelector('em'),...banner.querySelectorAll('.banner-copy'),banner.querySelector('.primary-button')].filter(Boolean):[];
 }
 const entrance=createHeaderEntrance(banner,{window:win,targets,options:i=>({distance:win.innerWidth<=767?10:14,duration:460,delay:i*80,easing:'cubic-bezier(0.22, 1, 0.36, 1)'})});
 return {prepare:entrance.prepare,setVisible:entrance.setActive,destroy:entrance.destroy};
}
