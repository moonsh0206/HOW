import {node} from './dom.js';
import {DASHBOARD_EGGS} from '../data/dashboardEggs.js';

const files={fishing:'fishing-silhouette.webp',flame:'spotlight-flame.webp',...Object.fromEntries(DASHBOARD_EGGS.map(item=>[item.key,item.file]))};
export function dashboardDecoration(kind,className){
 const img=node('img',undefined,className);
 img.src=`${import.meta.env?.BASE_URL??'/'}assets/decorations/${files[kind]}`;
 img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.decoding='async';
 img.addEventListener('error',()=>{img.hidden=true;},{once:true});
 return img;
}
