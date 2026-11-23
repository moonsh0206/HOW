const range=(random,min,max)=>min+random()*(max-min);
const palette=['#a94d25','#d87730','#e89642','#bd5927','#efba67'];
const mounts=new WeakMap();
export const emberCapacity=width=>width<=767?3:8;

// One flight, never an alternating/infinite animation. A new flight gets new parameters.
export function createEmberFlight({x,y,edge=false,mobile=false},random=Math.random){
 const grain=random()<.12,length=grain?range(random,1.8,2.8):range(random,3,12);
 const sideways=!edge&&random()<.18;
 const dx=edge?range(random,-3,3):range(random,-1,1)*range(random,18,65);
 const dy=sideways?-range(random,7,22):-range(random,mobile?24:38,mobile?70:120);
 const curve=edge?range(random,-1,1):range(random,-6,6),angle=range(random,18,160),turn=range(random,-12,12);
 const peak=range(random,mobile?.17:.2,mobile?.3:.43),duration=range(random,3800,mobile?7200:8800);
 const core=palette[Math.floor(random()*palette.length)],glow=random()<.22;
 const frames=[0,.07,.63,1].map((offset,i)=>({offset,transform:`translate3d(${dx*offset+Math.sin(offset*Math.PI)*curve}px,${dy*offset}px,0) rotate(${angle+turn*offset}deg)`,opacity:[0,peak,peak*.43,0][i]}));
 return {x,y,length,thickness:grain?length:range(random,.8,1.6),core,glow,grain,duration,dx,dy,frames};
}

// A handful of compositor animations + one irregular spawn timer; no frame loop.
export function createDashboardEmbers(host,{random=Math.random,setTimer,clearTimer}={}){
 mounts.get(host)?.destroy();
 const doc=host.ownerDocument,win=doc.defaultView;
 const layer=doc.createElement('div');layer.className='dashboard-embers';layer.setAttribute('aria-hidden','true');host.append(layer);
 const supported=typeof layer.animate==='function';
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const schedule=setTimer??win.setTimeout.bind(win),unschedule=clearTimer??win.clearTimeout.bind(win);
 let active=false,destroyed=false,visible=true,timer=null,sequence=0;
 const live=new Map();
 const enabled=()=>supported&&active&&!destroyed&&!doc.hidden&&!media?.matches&&visible&&host.isConnected;
 function clear(){if(timer!==null){unschedule(timer);timer=null;}for(const [element,animation]of live){animation.cancel();element.remove();}live.clear();}
 function origin(mobile){
  const box=host.getBoundingClientRect(),root=host.closest('#dashboard-page');
  if(!root||box.width<1||box.height<1)return null;
  const top=Math.max(10,-box.top+10),bottom=Math.min(box.height-10,win.innerHeight-box.top-10);
  if(bottom-top<24)return null;
  const blocked=[...root.querySelectorAll('.dashboard-heading-copy,.dashboard-player-search,.dashboard-kpi-controls,.dashboard-filter-host,.dashboard-context,.dashboard-card-slot,.dashboard-spotlight,.dashboard-panel')].map(e=>e.getBoundingClientRect());
  for(let attempt=0;attempt<32;attempt++){
   const edge=random()<.68;
   const upper=!edge&&!mobile&&random()<.6;
   const x=edge?(random()<.5?range(random,7,mobile?10:19):box.width-range(random,7,mobile?10:19)):upper?range(random,box.width*.65,box.width*.94):range(random,box.width*.08,box.width*.92);
   const y=upper?range(random,top+24,Math.min(bottom,top+100)):range(random,top+(bottom-top)*.24,bottom);
   const flight=createEmberFlight({x,y,edge,mobile},random);
   const safe=[0,.25,.6,1].every(t=>{const px=box.left+x+flight.dx*t,py=box.top+y+flight.dy*t;return !blocked.some(b=>px>b.left-3&&px<b.right+3&&py>b.top-4&&py<b.bottom+4);});
   if(safe)return flight;
  }
  return null;
 }
 function spawn(mobile){
  const flight=origin(mobile);if(!flight)return;
  const element=doc.createElement('span');element.className='dashboard-ember';element.dataset.emberId=String(++sequence);
  element.style.left=flight.x+'px';element.style.top=flight.y+'px';element.style.width=flight.length+'px';element.style.height=flight.thickness+'px';element.style.setProperty('--ember-core',flight.core);
  element.dataset.grain=String(flight.grain);element.dataset.glow=String(flight.glow);element.dataset.lifetime=String(Math.round(flight.duration));layer.append(element);
  try{
   const animation=element.animate(flight.frames,{duration:flight.duration,easing:'cubic-bezier(.2,.45,.6,1)',fill:'both',iterations:1});live.set(element,animation);
   const finish=()=>{if(live.get(element)!==animation)return;live.delete(element);element.remove();animation.cancel();};animation.finished.then(finish,finish);
  }catch{element.remove();}
 }
 function trim(){const limit=emberCapacity(win.innerWidth);
  while(live.size>limit){const [element,animation]=live.entries().next().value;live.delete(element);animation.cancel();element.remove();}
 }
 function tick(){
  timer=null;if(!enabled())return;
  const mobile=win.innerWidth<=767,limit=emberCapacity(win.innerWidth);trim();
  if(live.size<limit)spawn(mobile);
  const quiet=random()<.15;
  timer=schedule(tick,quiet?range(random,mobile?2600:1800,mobile?4800:3600):range(random,mobile?800:380,mobile?1900:1050));
 }
 function sync(){if(!enabled()){clear();return;}if(timer===null)timer=schedule(tick,range(random,150,650));}
 const visibility=()=>sync(),motion=()=>sync(),resize=()=>{trim();sync();};
 doc.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',motion);
 win.addEventListener('resize',resize,{passive:true});
 // Hidden routes and a completely offscreen dashboard do not keep spawning.
 const observer=supported&&win.IntersectionObserver?new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();}):null;observer?.observe(host);
 const api={
  setActive(next){active=!!next;sync();},
  destroy(){if(destroyed)return;destroyed=true;clear();observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',motion);win.removeEventListener('resize',resize);layer.remove();if(mounts.get(host)===api)mounts.delete(host);},
 };
 mounts.set(host,api);return api;
}
