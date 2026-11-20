import {t} from '../i18n/i18n.js';
// Only relocate existing controls; their select/change bridge remains untouched.
const states=new WeakMap();
export function syncCompactMain(root=document.querySelector('#statistics-filters')){
 if(!root)return;
 let state=states.get(root);
 if(!state){
  const doc=root.ownerDocument;
  state={labels:['mode','map'].map(key=>doc.querySelector(`#stats-${key}`)?.closest('label')).filter(Boolean),open:false};
  state.homes=state.labels.map(label=>{const home=doc.createComment('Original filter position');label.before(home);return home;});
  state.extra=doc.createElement('details');state.extra.className='compact-advanced';
  const summary=doc.createElement('summary');state.summary=summary;state.extra.append(summary);
  state.fields=doc.createElement('div');state.fields.className='compact-advanced-fields';state.fields.id='compact-advanced-fields';state.extra.append(state.fields);summary.setAttribute('aria-controls',state.fields.id);
  state.extra.addEventListener('toggle',()=>{if(state.active)state.open=state.extra.open;summary.setAttribute('aria-expanded',String(state.extra.open));if(!state.extra.open&&state.fields.contains(doc.activeElement))summary.focus();});
  state.info=doc.createElement('div');state.info.className='compact-source';
  state.infoElements=['#active-cohort-freshness','.statistics-notice'].map(s=>doc.querySelector(s)).filter(Boolean);
  state.infoHomes=state.infoElements.map(el=>{const home=doc.createComment('Original statistics information');el.before(home);return home;});
  states.set(root,state);
 }
 const active=!!root.closest('#heroes,#dashboard-filter-host')&&root.ownerDocument.defaultView.innerWidth<=767;
 if(active!==state.active){
  state.active=active;
  if(active){
   root.append(state.extra);state.fields.append(...state.labels);state.extra.open=state.open;
  }else{
   state.open=state.extra.open;
   state.labels.forEach((label,i)=>state.homes[i].after(label));state.extra.remove();
  }
 }
 const sourceActive=active&&!!root.closest('#heroes');
 if(sourceActive!==state.sourceActive){state.sourceActive=sourceActive;if(sourceActive){root.before(state.info);state.info.append(...state.infoElements);}else{state.infoElements.forEach((el,i)=>state.infoHomes[i].after(el));state.info.remove();}}
 state.summary.setAttribute('aria-expanded',String(state.extra.open));
 const mode=root.ownerDocument.querySelector('#stats-mode'),map=root.ownerDocument.querySelector('#stats-map');
 const applied=[mode?.value!=='competitive'?mode?.selectedOptions[0]?.textContent:null,map?.value!=='all'?map?.selectedOptions[0]?.textContent:null].filter(Boolean);
 state.summary.textContent=t("message.69ac7baff6bd",{"0":(applied.length?' · '+applied.join(' / '):'')});
 const status=root.ownerDocument.querySelector('#stats-status');
}
