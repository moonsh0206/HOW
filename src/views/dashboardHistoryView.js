import {node} from './dom.js';
import {t,formatLocale} from '../i18n/i18n.js';
import {roleName} from './roleIcon.js';
import {PATCH_CATALOG} from '../data/patchCatalog.js';
import {verifiedPatch} from '../models/patchHistoryModel.js';
const ns='http://www.w3.org/2000/svg';
const svgNode=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const dayIndex=day=>Date.parse(day+'T00:00:00Z')/86400000;
// The plot fills its panel, but text stays in CSS pixels rather than stretching
// with the SVG's independent horizontal/vertical scale factors.
export function syncDashboardTextScale(svg,width,height){
 if(!(width>0&&height>0))return;
 for(const text of svg.querySelectorAll('text')){const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'));text.setAttribute('transform',`translate(${x} ${y}) scale(${510/width} ${220/height}) translate(${-x} ${-y})`);}
}
const textObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(entries=>{for(const {target,contentRect}of entries){if(!target.isConnected){textObserver.unobserve(target);continue;}syncDashboardTextScale(target,contentRect.width,contentRect.height);}});
function roleLegend(data){
 const legend=node('div',undefined,'dashboard-legend'),series=data?.series??[];
 const latestDay=series.flatMap(s=>s.points.map(p=>p.day)).sort().at(-1);
 for(const role of ['tank','damage','support']){
  // Use the common latest observation day; never present an older valid value as current.
  const point=series.find(s=>s.role===role)?.points.findLast(p=>p.day===latestDay);
  const entry=node('span',undefined,'dashboard-'+role),name=node('span',roleName(role)),value=node('strong',Number.isFinite(point?.value)?point.value.toFixed(1)+'%':t('미제공'));
  entry.dataset.legendRole=role;entry.append(name,value);legend.append(entry);
 }
 return legend;
}
export function dashboardHistoryChart(data){
 const root=node('div',undefined,'dashboard-history-chart');
 const hasPoint=data?.series?.some(s=>s.points.some(p=>Number.isFinite(p.value)));
 if(!hasPoint){root.append(node('p',t('dashboard.historyEmpty'),'dashboard-empty'),roleLegend(data));return root;}
 if(!data.available)root.append(node('p',t('dashboard.singleObservation'),'dashboard-caption'));
 const points=data.series.flatMap(s=>s.points.filter(p=>p.value!==null));
 const minDay=Math.min(...points.map(p=>dayIndex(p.day))),maxDay=Math.max(...points.map(p=>dayIndex(p.day)));
 const min=Math.max(0,Math.floor((Math.min(...points.map(p=>p.value))-2)/5)*5),max=Math.min(100,Math.ceil((Math.max(...points.map(p=>p.value))+2)/5)*5);
 root.classList.toggle('is-single-observation',minDay===maxDay);
 const x=p=>minDay===maxDay?265:50+(dayIndex(p.day)-minDay)/Math.max(1,maxDay-minDay)*430,y=p=>175-(p.value-min)/Math.max(1,max-min)*145;
 const svg=svgNode('svg',{viewBox:'0 0 510 220',preserveAspectRatio:'none',role:'img','aria-label':t('dashboard.graphLabel')});
 const title=svgNode('title');title.textContent=t('dashboard.graphLabel');svg.append(title);
 for(let i=0;i<4;i++){const value=min+(max-min)*i/3,py=175-145*i/3;svg.append(svgNode('line',{x1:50,x2:480,y1:py,y2:py,class:'dashboard-gridline'}));const text=svgNode('text',{x:43,y:py+4,'text-anchor':'end'});text.textContent=value.toFixed(1)+'%';svg.append(text);}
 for(const day of [...new Set(points.map(p=>p.day))].filter((_,i,all)=>i===0||i===all.length-1||i===Math.floor(all.length/2))){const text=svgNode('text',{x:x({day}),y:202,'text-anchor':'middle'});text.textContent=new Date(day+'T00:00:00Z').toLocaleDateString(formatLocale(),{month:'numeric',day:'numeric',timeZone:'UTC'});svg.append(text);}
 const defs=svgNode('defs'),clip=svgNode('clipPath',{id:'dashboard-history-reveal'}),rect=svgNode('rect',{x:46,y:20,width:440,height:165});rect.dataset.dashboardReveal='';clip.append(rect);defs.append(clip);svg.append(defs);
 const traces=svgNode('g',{'clip-path':'url(#dashboard-history-reveal)'});
 for(const patch of PATCH_CATALOG){const day=patch.publishedDate??patch.date;if(dayIndex(day)<minDay||dayIndex(day)>maxDay)continue;const marker=svgNode('line',{x1:x({day}),x2:x({day}),y1:25,y2:175,class:'dashboard-patch-marker'});const hint=svgNode('title');hint.textContent=`${day} · ${patch.id} · ${t('dashboard.patchBoundary')}`;marker.append(hint);svg.append(marker);}
 const table=node('table'),accessible=node('div',undefined,'sr-only');accessible.append(table);table.append(node('caption',t('dashboard.graphLabel')));
 for(const series of data.series){let last=null,d='';for(const p of series.points){if(p.value===null){last=null;continue;}const contiguous=last&&p.connectPrevious!==false&&dayIndex(p.day)-dayIndex(last.day)===1;d+=`${contiguous?'L':'M'}${x(p).toFixed(2)},${y(p).toFixed(2)} `;last=p;
   const dot=svgNode('circle',{cx:x(p),cy:y(p),r:3,tabindex:0,role:'img',class:'dashboard-dot dashboard-'+series.role});const hint=svgNode('title');hint.textContent=`${roleName(series.role)} · ${p.day} · ${p.value.toFixed(2)}% · ${t('dashboard.meanCoverage',{count:p.count,total:p.targetCount??p.count})} · ${p.observedAt??p.day}`;hint.textContent+=verifiedPatch(p)?` · ${p.patch}`:t(' · 패치 미확인');dot.setAttribute('aria-label',hint.textContent);dot.append(hint);traces.append(dot);
   const row=node('tr');row.append(node('th',roleName(series.role)+' · '+p.day),node('td',p.value.toFixed(2)+'% · '+t('dashboard.meanCoverage',{count:p.count,total:p.targetCount??p.count})));table.append(row);
  }const path=svgNode('path',{d,fill:'none',class:'dashboard-line dashboard-'+series.role});traces.prepend(path);
 }
 svg.append(traces);root.append(svg,accessible);textObserver?.observe(svg);
 const tooltip=node('output',undefined,'dashboard-history-tooltip');tooltip.hidden=true;root.append(tooltip);
 const show=event=>{const dot=event.target.closest?.('.dashboard-dot');if(dot){tooltip.textContent=dot.getAttribute('aria-label');tooltip.hidden=false;}};
 const hide=event=>{if(!event.relatedTarget?.closest?.('.dashboard-dot'))tooltip.hidden=true;};
 root.addEventListener('focusin',show);root.addEventListener('pointerover',show);root.addEventListener('focusout',hide);root.addEventListener('pointerout',hide);
 root.append(roleLegend(data));
 root.append(node('small',t('dashboard.lastObservation',{time:new Date(Math.max(...points.map(p=>p.time))).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'})})));
 return root;
}
export function animateDashboardHistory(root){
 const svg=root?.querySelector('svg');if(svg?.isConnected){const rect=svg.getBoundingClientRect();syncDashboardTextScale(svg,rect.width,rect.height);}
 if(!root?.isConnected||root.closest('[hidden]')||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return ()=>{};
 const animations=[];
 try{const reveal=root.querySelector('[data-dashboard-reveal]');if(reveal?.animate)animations.push(reveal.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:520,easing:'cubic-bezier(0.22, 1, 0.36, 1)'}));for(const dot of root.querySelectorAll('.dashboard-dot'))if(dot.animate)animations.push(dot.animate([{opacity:0},{opacity:1}],{duration:240,delay:220,fill:'backwards'}));}catch{}
 return ()=>animations.forEach(a=>a.cancel());
}
