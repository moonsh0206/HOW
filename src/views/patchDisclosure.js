import {t} from '../i18n/i18n.js';
import {node} from './dom.js';

// Only display state is managed here; patch contents and their own details are unchanged.
export function addPatchDisclosure(section,body,{heroKey,eligible,initialOpen=false}) {
  if(!eligible)return;
  const win=section.ownerDocument.defaultView,media=win?.matchMedia?.('(max-width: 600px)');
  const button=node('button',undefined,'hero-patch-toggle'),text=node('span'),arrow=node('span','⌄','hero-patch-arrow');
  button.type='button';body.id=`hero-patch-body-${heroKey}`;button.setAttribute('aria-controls',body.id);arrow.setAttribute('aria-hidden','true');button.append(text,arrow);section.querySelector('.hero-patch-heading').append(button);
  let mobileOpen=initialOpen,animation=null,version=0;
  function apply(animate=false){
    const expanded=!media?.matches||mobileOpen;
    const height=body.hidden?0:body.getBoundingClientRect().height;
    ++version;const token=version;animation?.cancel();animation=null;
    button.setAttribute('aria-expanded',String(expanded));text.textContent=expanded?t('접기'):t('patch.viewDetails');section.dataset.patchOpen=String(expanded);
    if(!expanded&&body.contains(section.ownerDocument.activeElement))button.focus({preventScroll:true});
    if(!media?.matches&&section.ownerDocument.activeElement===button)section.querySelector('.hero-patch-meta a')?.focus({preventScroll:true});
    body.inert=!expanded;body.hidden=false;
    const finish=()=>{if(token!==version)return;body.hidden=!expanded;body.style.overflow='';animation?.cancel();animation=null;};
    if(!animate||!body.animate||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return;}
    body.style.overflow='hidden';animation=body.animate([{height:`${height}px`},{height:expanded?`${body.scrollHeight}px`:'0px'}],{duration:250,easing:'ease-out',fill:'both'});
    animation.finished.then(finish).catch(()=>{});
  }
  button.addEventListener('click',()=>{mobileOpen=!mobileOpen;apply(true);});
  const resize=()=>apply();media?.addEventListener?.('change',resize);
  section.patchDisclosure={get open(){return mobileOpen;},setOpen(value){mobileOpen=value;apply();},dispose(){++version;animation?.cancel();media?.removeEventListener?.('change',resize);}};
  apply();
}
export function restorePatchDisclosure(previous,next){
  if(previous?.dataset.heroKey===next?.dataset.heroKey&&previous?.patchDisclosure&&next?.patchDisclosure)next.patchDisclosure.setOpen(previous.patchDisclosure.open);
  previous?.patchDisclosure?.dispose();
}
