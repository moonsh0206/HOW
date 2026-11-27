// Prepare synchronously before route visibility changes; animate only after
// the shared page/swipe transition settles. Resting CSS is always readable.
export function createHeaderEntrance(root,{targets,options,pendingClass='',introOwned=false,window:win=root?.ownerDocument.defaultView}={}){
 const doc=root?.ownerDocument,media=(win?.matchMedia??globalThis.matchMedia)?.call(win,'(prefers-reduced-motion: reduce)');
 let active=false,played=false,prepared=false,running=false,disposed=false,frame=null,timer=null,generation=0,elements=[],animations=[];
 const visibilityRoot=root?.closest('#dashboard-page,#list-page,#player-search-page')??root;
 const transitioning=()=>doc.documentElement.matches('.how-swipe-transition,.how-page-transition');
 const intro=()=>introOwned&&doc.documentElement.classList.contains('how-brand-intro-active');
 function clear(){
  ++generation;if(frame!==null)win.cancelAnimationFrame?.(frame);frame=null;win?.clearTimeout(timer);timer=null;
  for(const a of animations)try{a.cancel();}catch{}animations=[];
  for(const el of elements){el.classList.remove('how-header-prepared');el.style.removeProperty('--how-header-distance');}
  if(pendingClass)root?.classList.remove(pendingClass);prepared=false;running=false;
 }
 function finish(){played=true;clear();}
 function prepare(){
  if(disposed||played||prepared||running||!root)return;
  elements=targets().filter(Boolean);
  if(media?.matches||doc.hidden||intro()||!win?.requestAnimationFrame||!elements.length||elements.some(el=>typeof el.animate!=='function')){played=true;clear();return;}
  prepared=true;
  elements.forEach((el,i)=>{el.style.setProperty('--how-header-distance',`${options(i).distance}px`);el.classList.add('how-header-prepared');});
  if(pendingClass)root.classList.add(pendingClass);
  // A stuck/cancelled router must never leave a header hidden indefinitely.
  timer=win.setTimeout(finish,2200);
 }
 function start(){
  if(disposed||!active||played||running||frame!==null)return;
  if(intro()||media?.matches||doc.hidden){finish();return;}
  if(!prepared)prepare();if(!prepared||transitioning()||!root.isConnected||visibilityRoot.closest('[hidden]'))return;
  frame=win.requestAnimationFrame(()=>{
   frame=null;if(disposed||!active||played||!prepared)return;
   if(!root.isConnected){finish();return;}
   if(intro()||media?.matches||doc.hidden){finish();return;}
   if(transitioning()||visibilityRoot.closest('[hidden]'))return;
   const token=generation;running=true;
   try{
    animations=elements.map((el,i)=>{const {distance,...timing}=options(i);const animation=el.animate([{opacity:0,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}],{...timing,fill:'both'});Promise.resolve(animation.finished).catch(()=>{});animation.addEventListener?.('cancel',()=>{if(token===generation)finish();},{once:true});animations.push(animation);return animation;});
    // WAAPI now owns the initial frame (including stagger delays); no paint
    // can happen between removing the prepared style and creating the effect.
    for(const el of elements){el.classList.remove('how-header-prepared');el.style.removeProperty('--how-header-distance');}
    if(pendingClass)root.classList.remove(pendingClass);
    win.clearTimeout(timer);timer=win.setTimeout(finish,Math.max(...elements.map((el,i)=>{const t=options(i);return t.duration+(t.delay??0);}))+250);
    Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(!disposed&&active&&token===generation)finish();});
   }catch{finish();}
  });
 }
 const observer=win?.MutationObserver?new win.MutationObserver(start):null;
 if(doc)observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
 if(visibilityRoot)observer?.observe(visibilityRoot,{attributes:true,attributeFilter:['hidden']});
 const preference=()=>{if(media.matches)finish();};media?.addEventListener?.('change',preference);
 const visibility=()=>{if(doc.hidden&&(prepared||running))finish();else start();};doc?.addEventListener('visibilitychange',visibility);
 return {prepare,setActive(next){if(disposed)return;if(next&&!active&&!prepared)played=false;active=next;if(!active){clear();played=false;}else{prepare();start();}},destroy(){disposed=true;active=false;clear();observer?.disconnect();media?.removeEventListener?.('change',preference);doc?.removeEventListener('visibilitychange',visibility);}};
}
