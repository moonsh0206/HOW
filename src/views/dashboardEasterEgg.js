import {pickDashboardEgg} from '../data/dashboardEggs.js';
import {dashboardDecoration} from './dashboardDecorations.js';

// Only false -> true means a visit. Data renders, language and resize never draw.
export function createDashboardEasterEgg(form,{random=Math.random}={}){
 const doc=form.ownerDocument,win=doc.defaultView,media=(win.matchMedia??globalThis.matchMedia)?.call(win,'(prefers-reduced-motion: reduce)');
 let active=false,disposed=false,token=0,img=null,ready=false,shown=false,frame=null,animation=null,observer=null;
 const cancelMotion=()=>{if(frame!==null)win.cancelAnimationFrame?.(frame);frame=null;animation?.cancel();animation=null;};
 function reveal(){
  if(disposed||!active||!ready||shown||frame!==null||!img?.isConnected||doc.documentElement.classList.contains('how-brand-intro-active')||form.closest('#dashboard-page')?.hidden)return;
  const mine=token,target=img;
  const show=()=>{frame=null;if(mine!==token||!active||disposed||!target.isConnected)return;shown=true;
   if(!media?.matches&&target.animate)try{animation=target.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'backwards'});}catch{}
   target.style.visibility='';target.dataset.eggReady='true';
  };
  if(media?.matches||!win.requestAnimationFrame)show();else frame=win.requestAnimationFrame(show);
 }
 function close(){++token;cancelMotion();observer?.disconnect();observer=null;if(img){img.onload=img.onerror=null;img.remove();}img=null;ready=false;shown=false;delete form.dataset.eggHero;}
 const motion=()=>{if(media.matches){cancelMotion();if(shown&&img)img.style.visibility='';else reveal();}};media?.addEventListener?.('change',motion);
 return {
  setActive(next){
   if(disposed||active===next)return;active=next;close();if(!active)return;
   const choice=pickDashboardEgg(random),mine=token;form.dataset.eggHero=choice.key;
   img=dashboardDecoration(choice.key,'dashboard-easter-egg');img.style.visibility='hidden';img.dataset.hero=choice.key;
   for(const [key,value]of Object.entries(choice))if(typeof value==='number')img.style.setProperty('--egg-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value+'px');
   const target=img;
   img.onload=async()=>{try{await target.decode?.();}catch{}if(mine!==token||disposed||!active)return;ready=true;reveal();};
   img.onerror=()=>{if(mine===token){target.hidden=true;target.dataset.eggError='true';}};
   form.append(img);
   if(win.MutationObserver){observer=new win.MutationObserver(reveal);observer.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});const root=form.closest('#dashboard-page');if(root)observer.observe(root,{attributes:true,attributeFilter:['hidden']});}
  },
  destroy(){disposed=true;active=false;close();media?.removeEventListener?.('change',motion);},
 };
}
