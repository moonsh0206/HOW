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
  state.fields=doc.createElement('div');state.fields.className='compact-advanced-fields';state.extra.append(state.fields);
  state.extra.addEventListener('toggle',()=>{if(state.active)state.open=state.extra.open;});
  state.info=doc.createElement('details');state.info.className='compact-source';
  const infoSummary=doc.createElement('summary');state.infoSummary=infoSummary;state.info.append(infoSummary);
  state.infoElements=['#active-cohort-freshness','.statistics-notice'].map(s=>doc.querySelector(s)).filter(Boolean);
  state.infoHomes=state.infoElements.map(el=>{const home=doc.createComment('Original statistics information');el.before(home);return home;});
  states.set(root,state);
 }
 const active=!!root.closest('#heroes')&&root.ownerDocument.defaultView.innerWidth<=767;
 if(active!==state.active){
  state.active=active;
  if(active){
   root.append(state.extra);state.fields.append(...state.labels);state.extra.open=state.open;
   root.before(state.info);state.info.append(...state.infoElements);
  }else{
   state.labels.forEach((label,i)=>state.homes[i].after(label));state.extra.remove();
   state.infoElements.forEach((el,i)=>state.infoHomes[i].after(el));state.info.remove();
  }
 }
 const mode=root.ownerDocument.querySelector('#stats-mode'),map=root.ownerDocument.querySelector('#stats-map');
 const applied=[mode?.value!=='competitive'?mode?.selectedOptions[0]?.textContent:null,map?.value!=='all'?map?.selectedOptions[0]?.textContent:null].filter(Boolean);
 state.summary.textContent=t("message.69ac7baff6bd",{"0":(applied.length?' · '+applied.join(' / '):'')});
 const status=root.ownerDocument.querySelector('#stats-status');
 state.infoSummary.textContent=['error','stale'].includes(status?.dataset.state)?t("통계 상태 확인 필요 · 상세 보기"):t("OverFast API · 조회 정보");
}
