// Mobile menu gestures delegate to the existing navigation links and router.
const PAGES=['dashboard','list','player-search'];
const ROOTS=['#dashboard-page','#list-page','#player-search-page'];
const HASHES=['#/dashboard','#/tiers','#/player-search'];
export function swipeDirection(dx,dy){return Math.abs(dx)>=80&&Math.abs(dx)>=Math.abs(dy)*1.5?(dx<0?1:-1):0;}
export function createMenuSwipe({getPage,document:doc=document}){
 const win=doc.defaultView,media=win.matchMedia?.('(max-width: 767px) and (any-pointer: coarse)'),reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let gesture=null,busy=false,disposed=false,animations=[],generation=0;
 const visible=el=>!el.closest('[hidden]')&&win.getComputedStyle(el).display!=='none';
 function blocked(){return doc.documentElement.classList.contains('how-page-transition')||doc.documentElement.classList.contains('how-brand-intro-active')||[...doc.querySelectorAll('[aria-modal="true"],dialog[open],[role="combobox"][aria-expanded="true"],.site-header [aria-expanded="true"]')].some(visible);}
 function excluded(event){
  return event.composedPath().some(el=>{
   if(!el.matches)return false;
   if(el.matches('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),svg,canvas,[data-swipe-ignore],[role="slider"],[role="combobox"],[role="listbox"],.filter-combobox,.pick-history,.dashboard-history-body,.perk-comparison,.perk-comparison-panel,.dashboard-kpi,.carousel,[aria-roledescription="carousel"]'))return true;
   const style=win.getComputedStyle(el);return el.scrollWidth>el.clientWidth+1&&['auto','scroll'].includes(style.overflowX);
  });
 }
 function cancel(){gesture=null;}
 function start(event){
  cancel();if(disposed||busy||!media?.matches||event.touches.length!==1||blocked()||excluded(event))return;
  const index=PAGES.indexOf(getPage()),p=event.touches[0];if(index<0||p.clientX<28||p.clientX>win.innerWidth-28)return;
  if(!event.target.closest(ROOTS[index]))return;
  gesture={id:p.identifier,x:p.clientX,y:p.clientY,index,page:getPage()};
 }
 function move(event){
  if(!gesture)return;if(event.touches.length!==1){cancel();return;}
  const p=[...event.touches].find(p=>p.identifier===gesture.id);if(!p){cancel();return;}
  const dx=Math.abs(p.clientX-gesture.x),dy=Math.abs(p.clientY-gesture.y);
  if(dy>12&&dy>dx/1.5)cancel();
 }
 async function end(event){
  const g=gesture;cancel();if(!g||busy||!media?.matches||blocked()||getPage()!==g.page)return;
  const p=[...event.changedTouches].find(p=>p.identifier===g.id);if(!p)return;
  const direction=swipeDirection(p.clientX-g.x,p.clientY-g.y),next=g.index+direction;
  if(!direction||next<0||next>=PAGES.length)return;
  const link=doc.querySelector(`a[href="${HASHES[next]}"]`);if(!link)return;
  busy=true;const token=++generation,old=doc.querySelector(ROOTS[g.index]);
  const incoming=doc.querySelector(ROOTS[next]);
  const cleanup=()=>{for(const a of animations)a.cancel();animations=[];doc.documentElement.classList.remove('how-swipe-transition');};
  const animate=(el,frames,duration)=>{if(reduced?.matches||!el?.animate)return null;const a=el.animate(frames,{duration,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'both'});animations.push(a);return a;};
  try{
   doc.documentElement.classList.add('how-swipe-transition');
   // Hold the destination's initial style before the router makes it visible.
   const entrance=animate(incoming,[{opacity:0,transform:`translateX(${direction*8}px)`},{opacity:1,transform:'translateX(0)'}],270);entrance?.pause();
   const exit=animate(old,[{opacity:1,transform:'translateX(0)'},{opacity:.12,transform:`translateX(${-direction*6}px)`}],160);
   if(exit)try{await exit.finished;}catch{}
   if(disposed||token!==generation||getPage()!==g.page||blocked())return;
   link.dataset.swipeNavigation='true';link.click();delete link.dataset.swipeNavigation;
   // Localized navigation queues its router dispatch; run after that dispatch,
   // before the next paint, so no unanimated destination frame is exposed.
   await new Promise(resolve=>win.queueMicrotask(resolve));
   if(disposed||token!==generation||getPage()!==PAGES[next])return;
   entrance?.play();if(entrance)try{await entrance.finished;}catch{}
  }catch{if(!disposed&&getPage()===g.page)link.click(); /* Restore usable navigation if motion is unsupported or fails. */ }
  finally{cleanup();busy=false;}
 }
 const scroll=()=>cancel(),hide=()=>{if(doc.hidden)cancel();};
 doc.addEventListener('touchstart',start,{passive:true});doc.addEventListener('touchmove',move,{passive:true});doc.addEventListener('touchend',end,{passive:true});doc.addEventListener('touchcancel',cancel,{passive:true});doc.addEventListener('scroll',scroll,{passive:true,capture:true});doc.addEventListener('visibilitychange',hide);
 return {destroy(){disposed=true;++generation;cancel();animations.forEach(a=>a.cancel());animations=[];doc.documentElement.classList.remove('how-swipe-transition');doc.removeEventListener('touchstart',start);doc.removeEventListener('touchmove',move);doc.removeEventListener('touchend',end);doc.removeEventListener('touchcancel',cancel);doc.removeEventListener('scroll',scroll,true);doc.removeEventListener('visibilitychange',hide);}};
}
