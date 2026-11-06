import {RANK_ASSETS} from '../data/rankAssets.js';
// The adjacent option label is the text fallback. Original HOW art is identified explicitly.
export function rankEmblem(key,{assets=RANK_ASSETS}={}){
 const plus=key.endsWith('_plus'),base=plus?key.slice(0,-5):key,asset=assets[base];
 const frame=document.createElement('span');frame.className='rank-emblem rank-emblem--fallback';frame.dataset.rank=base;frame.setAttribute('aria-hidden','true');
 const original=asset?.kind==='how-original'&&asset.status==='ready'&&asset.permissionStatus==='project-authored';
 const userLocal=asset?.kind==='user-local'&&asset.status==='configured'&&asset.permissionStatus==='user-authorized'&&asset.format==='png';
 const official=asset?.kind!=='how-original'&&asset?.status==='verified'&&asset.currentVersionStatus==='verified'&&asset.permissionStatus==='confirmed';
 // Both paths are local-only. HOW artwork must never masquerade as verified official art.
 if((userLocal||original||official)&&typeof asset.assetUrl==='string'&&asset.assetUrl.startsWith('/')&&!asset.assetUrl.startsWith('//')){
  frame.dataset.artwork=userLocal?'user-local':original?'how-original':'official';
  const image=document.createElement('img');image.alt='';image.decoding='async';image.draggable=false;
  const scale=asset.opticalScale??1;
  // Uniform optical sizing only: no recoloring, stretching, or pixel rewriting.
  if(Number.isFinite(scale)&&scale>=0.75&&scale<=1.5)frame.style.setProperty('--rank-optical-scale',String(scale));
  image.addEventListener('error',()=>{image.remove();frame.classList.add('rank-emblem--fallback');frame.style.removeProperty('--rank-optical-scale');},{once:true});
  image.src=asset.assetUrl;frame.classList.remove('rank-emblem--fallback');frame.append(image);
 }
 if(plus){frame.classList.add('rank-emblem--plus');const badge=document.createElement('span');badge.className='rank-plus';frame.append(badge);}
 return frame;
}
