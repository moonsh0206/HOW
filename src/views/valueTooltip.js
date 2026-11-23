// A local tooltip disappears with its chart; no global listeners or timers.
export function valueTooltip(host) {
 const tip=document.createElement('output');tip.className='chart-value-tooltip';tip.hidden=true;tip.setAttribute('aria-hidden','true');host.append(tip);
 function hide(){tip.hidden=true;}
 function show(text,anchor){
  tip.textContent=text;tip.hidden=false;
  const bounds=host.getBoundingClientRect(),rect=anchor.getBoundingClientRect();
  const width=tip.offsetWidth||72,height=tip.offsetHeight||28;
  tip.style.left=`${Math.max(0,Math.min(bounds.width-width,rect.left+rect.width/2-bounds.left-width/2))}px`;
  tip.style.top=`${Math.max(0,rect.top-bounds.top-height-5)}px`;
 }
 host.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 host.addEventListener('pointerleave',hide);
 host.addEventListener('focusout',event=>{if(!host.contains(event.relatedTarget))hide();});
 return {show,hide,element:tip};
}
