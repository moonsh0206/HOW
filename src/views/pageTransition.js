// Route DOM and scroll settle before destination motion starts. No view clones.
export function createPageTransition({document:doc=document,window:win=doc.defaultView}={}){
 let serial=0,animations=[],frame=null,restore=null,resolveFrame=null;
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 function cancel(){++serial;for(const a of animations)a.cancel();animations=[];if(frame!==null)win.cancelAnimationFrame(frame);frame=null;resolveFrame?.();resolveFrame=null;restore?.();restore=null;doc.documentElement.classList.remove('how-page-transition');}
 async function run(from,to,commit,accept=()=>true){
  cancel();if(!from||!to||from===to||media?.matches||!from.animate||!to.animate||doc.documentElement.classList.contains('how-brand-intro-active')){commit();return;}
  const token=serial,main=from.closest('main'),prior=main?.style.minHeight;
  if(main){main.style.minHeight=main.getBoundingClientRect().height+'px';restore=()=>{main.style.minHeight=prior;};}
  doc.documentElement.classList.add('how-page-transition');let committed=false;
  const play=(el,frames,duration)=>{const a=el.animate(frames,{duration,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'both'});animations.push(a);return a;};
  try{
   const entrance=play(to,[{opacity:.15,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],240);entrance.pause();
   const exit=play(from,[{opacity:1},{opacity:.2}],120);try{await exit.finished;}catch{}
   if(serial!==token||!accept())return;
   commit();committed=true;
   // The router schedules scroll restoration first. Start in that same next
   // frame, after scroll, while the destination is still held at its dim initial opacity.
   await new Promise(resolve=>{resolveFrame=resolve;frame=win.requestAnimationFrame(()=>{frame=null;resolveFrame=null;resolve();});});
   if(serial!==token||!accept())return;
   entrance.play();try{await entrance.finished;}catch{}
  }catch{if(serial===token&&!committed&&accept())commit();}
  finally{if(serial===token)cancel();}
 }
 return {run,cancel,destroy:cancel};
}
