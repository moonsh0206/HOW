import {LOGO_MARKUP} from '../data/introLogo.js';
import {routeHash} from '../i18n/routes.js';
import {t} from '../i18n/i18n.js';

export const INTRO_SESSION_KEY='how:brand-intro:v1';
export const INTRO_TIMING=Object.freeze({complete:2100,flight:2400,land:3250,reveal:2650,end:3400,watchdog:5000});
export function consumeIntroVisit({location,base='/',storage,reduced=false,navigationType='navigate'}){
 try{const visited=storage.getItem(INTRO_SESSION_KEY);storage.setItem(INTRO_SESSION_KEY,'1');const path=location.pathname.startsWith(base)?location.pathname.slice(base.length).replace(/(?:\/)?index\.html$/,'').replace(/\/$/,''):null;return !visited&&!reduced&&navigationType==='navigate'&&path!==null&&/^(?:(?:ko|en|ja)(?:\/dashboard)?)?$/.test(path)&&routeHash(location,base)==='#/dashboard';}catch{return false;}
}
export function introGeometry(viewport,target,art={x:0,y:0,width:439,height:217}){
 const width=Math.min(680,viewport.width*.88),height=width*217/439;
 const from={left:(viewport.width-width)/2,top:(viewport.height-height)/2,width,height};
 const scale=target.width/art.width,toWidth=439*scale,toHeight=217*scale;
 const to={left:target.left-art.x*scale,top:target.top+target.height/2-(art.y+art.height/2)*scale,width:toWidth,height:toHeight};
 return {from,to,transform:`translate3d(${to.left-from.left}px,${to.top-from.top}px,0) scale(${to.width/from.width})`};
}
const instances=new WeakMap();
export function createBrandIntro({document:doc=document,window:win=window,base='/',storage,now=()=>win.performance.now(),requestFrame=fn=>win.requestAnimationFrame(fn),cancelFrame=id=>win.cancelAnimationFrame(id),setTimer=(fn,ms)=>win.setTimeout(fn,ms),clearTimer=id=>win.clearTimeout(id)}={}){
 if(instances.has(doc))return instances.get(doc);
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let store=storage;try{store??=win.sessionStorage;}catch{}
 const allowed=consumeIntroVisit({location:win.location,base,storage:store,reduced:!!media?.matches,navigationType:win.performance.getEntriesByType?.('navigation')[0]?.type??'navigate'});
 let logo=null;if(allowed){const template=doc.createElement('template');template.innerHTML=LOGO_MARKUP;logo=template.content.firstElementChild;logo.setAttribute('aria-label','HOW · HUB OVERWATCH');}
 let host=null,overlay=null,backdrop=null,skip=null,frame=null,watchdog=null,started=null,flight=null,reveal=null,resizeObserver=null,done=!allowed,disposed=false,phase='idle',overflow='',inertBefore=[],returnFocus=null,geometry=null,art={x:0,y:0,width:439,height:217};
 const viewport=()=>({width:win.innerWidth,height:win.innerHeight});
 const route=()=>routeHash(win.location,base)==='#/dashboard';
 function styleAt(rect){Object.assign(logo.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',transform:'none',transformOrigin:'0 0',zIndex:'2002'});}
 function center(){const v=viewport(),r=introGeometry(v,{left:0,top:0,width:120,height:32}).from;styleAt(r);}
 function setPhase(value){phase=value;if(overlay)overlay.dataset.phase=value;}
 function measureArtwork(){
  const canvas=logo.getBoundingClientRect(),parts=[...logo.querySelectorAll('.lettersOp,.tagOp,.bPos')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);if(!canvas.width||!parts.length)return;
  const left=Math.min(...parts.map(r=>r.left)),right=Math.max(...parts.map(r=>r.right)),top=Math.min(...parts.map(r=>r.top)),bottom=Math.max(...parts.map(r=>r.bottom)),scale=canvas.width/439;
  art={x:(left-canvas.left)/scale,y:(top-canvas.top)/scale,width:(right-left)/scale,height:(bottom-top)/scale};
 }
 function clearHeader(){host?.classList.remove('how-brand-settled');for(const key of ['--brand-logo-width','--brand-logo-left','--brand-logo-center'])host?.style.removeProperty(key);}
 function stopListeners(){resizeObserver?.disconnect();resizeObserver=null;win.removeEventListener('resize',resize);win.visualViewport?.removeEventListener('resize',resize);win.removeEventListener('hashchange',navigation);win.removeEventListener('popstate',navigation);doc.removeEventListener('how:languagechange',navigation);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('keydown',key,true);media?.removeEventListener?.('change',motion);}
 function finish(reason='complete',focus=true){
  if(done||disposed)return;done=true;setPhase(reason);if(frame!==null)cancelFrame(frame);frame=null;if(watchdog!==null)clearTimer(watchdog);watchdog=null;
  logo.classList.remove('how-brand-deploy');flight?.cancel();reveal?.cancel();backdrop?.getAnimations?.().forEach(a=>a.cancel());
  logo.removeAttribute('style');if(reason==='complete'&&host?.isConnected){host.style.setProperty('--brand-logo-width',439/art.width*100+'%');host.style.setProperty('--brand-logo-left',-art.x/art.width*100+'%');host.style.setProperty('--brand-logo-center',-(art.y+art.height/2)/217*100+'%');host.classList.add('how-brand-settled');logo.setAttribute('aria-hidden','true');logo.setAttribute('focusable','false');host.append(logo);}else{logo.remove();clearHeader();}
  doc.documentElement.classList.remove('how-brand-intro-active');doc.documentElement.style.overflow=overflow;
  for(const [element,inert,attribute]of inertBefore){element.inert=inert;if(!attribute)element.removeAttribute('inert');}inertBefore=[];
  skip?.removeEventListener('click',skipClick);overlay?.remove();overlay=null;skip=null;backdrop=null;flight=null;reveal=null;stopListeners();
  if(focus&&!doc.hidden&&route()){
   const target=doc.querySelector('#dashboard-filter-host .filter-combobox-trigger:not(:disabled)')??doc.querySelector('[data-dashboard-cycle]');target?.focus?.({preventScroll:true});
  }else if(returnFocus?.isConnected&&returnFocus!==doc.body&&doc.activeElement===doc.body&&!doc.hidden)returnFocus.focus?.({preventScroll:true});
 }
 function move(elapsed,rebase=false){
  if(!host?.isConnected||!route()){finish('route',false);return;}
  const target=host.getBoundingClientRect();if(!target.width||!target.height){finish('target-unavailable');return;}
  let from=geometry?.from??introGeometry(viewport(),target).from;
  if(rebase&&flight){const rect=logo.getBoundingClientRect();from={left:rect.left,top:rect.top,width:rect.width,height:rect.height};flight.cancel();styleAt(from);}
  const {to}=introGeometry(viewport(),target,art);geometry={from,to,art};if(elapsed>=INTRO_TIMING.land){flight?.cancel();styleAt(to);return;}
  if(!logo.animate){finish('unsupported');return;}
  flight=logo.animate([{transform:'translate3d(0,0,0) scale(1)'},{transform:`translate3d(${to.left-from.left}px,${to.top-from.top}px,0) scale(${to.width/from.width})`}],{duration:Math.max(80,INTRO_TIMING.land-elapsed),easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});
 }
 function tick(time){
  if(done||disposed)return;try{
   if(started===null){started=time;logo.getAnimations?.({subtree:true}).forEach(a=>{a.currentTime=0;a.play();});skip?.focus({preventScroll:true});}
   const elapsed=time-started;
   if(elapsed>=INTRO_TIMING.end){finish();return;}
   if(elapsed>=INTRO_TIMING.complete&&phase==='deploy'){logo.classList.remove('how-brand-deploy');measureArtwork();setPhase('hold');}
   if(elapsed>=INTRO_TIMING.flight&&phase==='hold'){setPhase('flight');move(elapsed);}
   if(done)return;
   if(elapsed>=INTRO_TIMING.reveal&&!reveal){const dashboard=doc.querySelector('#dashboard-page');if(dashboard?.animate){reveal=dashboard.animate([{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});backdrop?.animate([{opacity:1},{opacity:0}],{duration:650,easing:'ease-out',fill:'forwards'});}else{finish('unsupported');return;}}
   if(elapsed>=INTRO_TIMING.land)setPhase('landed');frame=requestFrame(tick);
  }catch{finish('error');}
 }
 function resize(){if(done)return;try{const elapsed=started===null?0:now()-started;if(elapsed<INTRO_TIMING.flight)center();else move(elapsed,true);}catch{finish('resize');}}
 function visibility(){if(doc.hidden)finish('background',false);}
 function navigation(){finish('navigation',false);}
 function skipClick(){finish('skip');}
 function motion(){if(media?.matches)finish('reduced-motion');}
 function key(event){if(event.key==='Escape'){event.preventDefault();finish('skip');}else if(event.key==='Tab'){event.preventDefault();skip?.focus({preventScroll:true});}}
 if(allowed){try{
  overlay=doc.createElement('div');overlay.className='how-brand-intro';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',t('intro.label'));
  backdrop=doc.createElement('div');backdrop.className='how-brand-backdrop';backdrop.setAttribute('aria-hidden','true');
  skip=doc.createElement('button');skip.type='button';skip.className='how-brand-skip';skip.textContent=t('intro.skip');skip.addEventListener('click',skipClick);
  overlay.append(backdrop,logo,skip);logo.classList.add('how-brand-deploy');doc.body.append(overlay);center();setPhase('deploy');
  overflow=doc.documentElement.style.overflow;doc.documentElement.style.overflow='hidden';doc.documentElement.classList.add('how-brand-intro-active');
  returnFocus=doc.activeElement;for(const element of doc.querySelectorAll('body>header,body>nav,body>main,body>footer,body>.skip-link')){inertBefore.push([element,!!element.inert,element.hasAttribute('inert')]);element.inert=true;element.setAttribute('inert','');}
  win.addEventListener('resize',resize);win.visualViewport?.addEventListener('resize',resize);win.addEventListener('hashchange',navigation);win.addEventListener('popstate',navigation);doc.addEventListener('how:languagechange',navigation);doc.addEventListener('visibilitychange',visibility);doc.addEventListener('keydown',key,true);media?.addEventListener?.('change',motion);
  watchdog=setTimer(()=>finish('watchdog'),INTRO_TIMING.watchdog);
 }catch{finish('error',false);}}
 const api={mount(target){host=target;if(done)return;try{if(host&&win.ResizeObserver){resizeObserver?.disconnect();resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(host);resizeObserver.observe(host.closest('.site-header')??host);}if(frame===null)frame=requestFrame(tick);}catch{finish('unsupported');}},skip:()=>finish('skip'),getState:()=>({phase,done,geometry}),destroy(){if(!done)finish('destroy',false);disposed=true;stopListeners();logo?.remove();clearHeader();instances.delete(doc);}};
 instances.set(doc,api);return api;
}
