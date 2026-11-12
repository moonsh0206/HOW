// Animate a changed result set once, never a rank/favorite refresh of the same IDs.
const states=new WeakMap();
export function revealResults(node,key){
 const previous=states.get(node);
 if(previous?.key===key)return;
 previous?.animation?.cancel();
 const state={key};states.set(node,state);
 const win=node.ownerDocument.defaultView;
 if(!key||win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches||typeof node.animate!=='function')return;
 state.animation=node.animate([{opacity:.65,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
}
