// Presentation only: the controller owns API requests and rejects old responses.
export function createDashboardMapMotion({panel,art,body}){
 const win=panel.ownerDocument.defaultView,media=(win.matchMedia??globalThis.matchMedia)?.call(win,'(prefers-reduced-motion: reduce)');
 let token=0,signature='',current=null,latest=null,animations=[],image=null,pending=null,disposed=false;
 const timers=new Map();
 const animated=()=>!media?.matches&&typeof body.animate==='function';
 function clear(){for(const a of animations)a.cancel();animations=[];for(const [id,resolve]of timers){win.clearTimeout(id);resolve();}timers.clear();for(const img of art.querySelectorAll('img'))if(img!==image)img.remove();}
 function play(el,frames,options){try{const a=el.animate(frames,{easing:'cubic-bezier(0.22,1,0.36,1)',...options});animations.push(a);return a.finished.catch(()=>{});}catch{return Promise.resolve();}}
 function preload(url){
  if(pending?.url===url)return pending;
  if(!url)return pending={url,promise:Promise.resolve(null)};
  const img=panel.ownerDocument.createElement('img');img.alt='';img.decoding='async';
  const promise=new Promise(resolve=>{img.onload=()=>{Promise.resolve(img.decode?.()).catch(()=>{}).then(()=>resolve(img));};img.onerror=()=>resolve(null);});img.src=url;
  return pending={url,promise};
 }
 const bounded=promise=>Promise.race([promise,new Promise(resolve=>{const id=win.setTimeout(()=>{timers.delete(id);resolve(null);},800);timers.set(id,resolve);})]);
 function showImage(next,run){
  const old=image;if(old===next)return;image=next;
  if(next)art.append(next);art.dataset.state=next?'ready':'fallback';
  if(!next){old?.remove();return;}
  if(run){if(old)play(old,[{opacity:1},{opacity:0}],{duration:320}).then(()=>{if(old!==image)old.remove();});if(next)play(next,[{opacity:0},{opacity:1}],{duration:320});}
  else old?.remove();
 }
 function commit(data,prepared,run){
  body.getAnimations?.().forEach(a=>a.cancel());
  body.replaceChildren(...data.nodes);body.dataset.mapKey=data.mapKey;body.inert=false;body.classList.remove('is-map-pending');panel.setAttribute('aria-busy','false');current=data;
  showImage(prepared,run);if(run)play(body,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:320});
 }
 function render(data){
  data.nodes??=[...data.content.childNodes];latest=data;if(disposed||signature===data.signature)return;signature=data.signature;const mine=++token;clear();
  const prepared=preload(data.imageUrl),same=current?.key===data.key;
  if(data.status==='loading'&&current){
   const height=body.getBoundingClientRect().height;if(height)body.style.minHeight=Math.max(height,parseFloat(body.style.minHeight)||0)+'px';
   panel.setAttribute('aria-busy','true');body.inert=true;body.classList.add('is-map-pending');
   const stamp=body.querySelector('[data-map-observed]');if(stamp)stamp.textContent=data.previousLabel(current.mapKey);
   return;
  }
  const run=animated()&&data.status!=='loading'&&(!same||current?.status==='loading'||body.classList.contains('is-map-pending'));
  const height=body.getBoundingClientRect().height;if(run&&height)body.style.minHeight=height+'px';
  if(!run){commit(data,current?.imageUrl===data.imageUrl?image:null,false);if(data.status==='loading')panel.setAttribute('aria-busy','true');prepared.promise.then(img=>{if(mine===token&&!disposed)showImage(img,animated()&&data.status!=='loading');});return;}
  bounded(prepared.promise).then(async img=>{
   if(mine!==token||disposed)return;
   if(current)await play(body,[{opacity:Number(win.getComputedStyle(body).opacity)||1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:170,fill:'forwards'});
   if(mine!==token||disposed)return;commit(data,img,true);
   // A slow image may crossfade in later, only for the still-current map.
   if(!img)prepared.promise.then(late=>{if(late&&mine===token&&!disposed)showImage(late,true);});
  });
 }
 const motion=()=>{if(media.matches){signature='';body.style.removeProperty('min-height');if(latest)render(latest);}};media?.addEventListener?.('change',motion);
 return {render,cancel(){++token;signature='';clear();body.style.removeProperty('min-height');body.inert=false;body.classList.remove('is-map-pending');panel.setAttribute('aria-busy','false');},destroy(){disposed=true;++token;clear();media?.removeEventListener?.('change',motion);pending=null;latest=null;}};
}
