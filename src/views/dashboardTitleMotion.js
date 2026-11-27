import {createHeaderEntrance} from './headerEntrance.js';
// One entrance per dashboard visit. The first brand intro owns its reveal.
export function createDashboardTitleMotion(root,targets){
 return createHeaderEntrance(root,{targets:()=>targets,pendingClass:'dashboard-title-pending',introOwned:true,options:i=>({distance:i?10:6,duration:i?620:500,delay:i?90:0,easing:'cubic-bezier(0.22,1,0.36,1)'})});
}
