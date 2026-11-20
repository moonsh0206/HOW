// One entrance per dashboard visit. Intro completion is observed, not timed twice.
export function createDashboardTitleMotion(root,targets){
 const win=root.ownerDocument.defaultView,doc=root.ownerDocument,media=(win.matchMedia??globalThis.matchMedia)?.call(win,'(prefers-reduced-motion: reduce)');
 let active=false,played=false,disposed=false,frame=null,animations=[];
 const cancel=()=>{if(frame!==null)win.cancelAnimationFrame?.(frame);frame=null;for(const animation of animations)animation.cancel();animations=[];root.classList.remove('dashboard-title-pending');};
 function start(){
  if(disposed||!active||played||frame!==null||!root.isConnected||root.hidden||doc.documentElement.classList.contains('how-brand-intro-active'))return;
  if(media?.matches||!win.requestAnimationFrame||!targets.every(el=>typeof el.animate==='function')){played=true;return;}
  root.classList.add('dashboard-title-pending');frame=win.requestAnimationFrame(()=>{frame=win.requestAnimationFrame(()=>{
   frame=null;if(disposed||!active||root.hidden||doc.documentElement.classList.contains('how-brand-intro-active')){root.classList.remove('dashboard-title-pending');return;}
   played=true;try{animations=targets.map((el,i)=>el.animate([{opacity:0,transform:`translateY(${i?10:6}px)`},{opacity:1,transform:'translateY(0)'}],{duration:i?620:500,delay:i?90:0,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'backwards'}));}catch{cancel();}finally{root.classList.remove('dashboard-title-pending');}
  });});
 }
 const observer=win.MutationObserver?new win.MutationObserver(start):null;
 observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});observer?.observe(root,{attributes:true,attributeFilter:['hidden']});
 const motion=()=>{if(media.matches){cancel();if(active)played=true;}};media?.addEventListener?.('change',motion);
 return {setActive(next){if(next&&!active)played=false;active=next;if(!active)cancel();else start();},destroy(){disposed=true;cancel();observer?.disconnect();media?.removeEventListener?.('change',motion);}};
}
