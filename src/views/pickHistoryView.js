import {historyDateLabels} from './historyAxis.js';
import {valueTooltip} from './valueTooltip.js';
import {formatLocale} from '../i18n/i18n.js';
import {t,label as translateLabel} from '../i18n/i18n.js';
import { node } from './dom.js';
import {prepareChartMotion} from './chartMotion.js';
export const HISTORY_LABELS = Object.freeze({get winRate(){return t('승률');},get pickRate(){return t('픽률');},get banRate(){return t('밴률');}});
const rate = point => point.value ?? point.pickRate;
export const formatHistoryRate = value => Number.isFinite(value) ? value.toFixed(1) : '—';
export function formatHistoryTimestamp(value){
 if(value==null||!Number.isFinite(new Date(value).getTime()))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
 return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute} KST`;
}
const stamp = value => new Date(value).toLocaleString(formatLocale(), { timeZone: 'Asia/Seoul', hour12: false });
// Keep point size and touch targets in screen pixels even in a narrow column.
const plotLayouts = new WeakMap();
const plotObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries=>{
  for(const {target,contentRect} of entries){
    if(!target.isConnected){plotObserver.unobserve(target);continue;}
    if(contentRect.width&&contentRect.height)plotLayouts.get(target)?.(contentRect);
  }
});
function svg(tag, attributes) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key,value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}
// At least 10 percentage points: small changes must not fill the entire plot.
export function historyScale(points) {
  const values = points.map(rate);
  const low = Math.min(...values), high = Math.max(...values);
  const padding = Math.max(2, (high - low) * 0.2);
  let min = Math.max(0, Math.floor((low - padding) / 2) * 2);
  let max = Math.min(100, Math.ceil((high + padding) / 2) * 2);
  if (max - min < 10) { max = Math.min(100, min + 10); min = Math.max(0, max - 10); }
  return { min, max, ticks: Array.from({ length: 5 }, (_, i) => max - (max - min) * i / 4) };
}
export function renderPickHistory(state = { status: 'idle', days: 7 }, filters) {
  const label = HISTORY_LABELS[state.metric] ?? HISTORY_LABELS.pickRate;
  const panel = node('section', undefined, 'pick-history'); panel.id = 'pick-history'; panel.setAttribute('aria-labelledby', 'pick-history-title');
  const head = node('div', undefined, 'history-heading'), title = node('h2', t("message.5fc55bb7d36d",{"0":(label)})); title.id = 'pick-history-title';
  head.append(title); panel.append(head);
  if (state.current) {
    head.append(node('strong', t("message.825cd15bfedc",{"0":(label),"1":(formatHistoryRate(rate(state.current)))}), 'history-current'));
    if (state.current.stale) panel.append(node('p',t("오래된 데이터"), 'history-warning'));
  }
  if (state.status === 'loading') { panel.setAttribute('aria-busy','true'); panel.append(node('p',t("불러오는 중"))); if (!state.current) return panel; }
  if (state.status === 'error') { panel.append(node('p',t("message.01d57da2f363",{"0":(label)}), 'history-warning')); const retry = node('button',t("다시 시도")); retry.dataset.action = 'history-retry'; panel.append(retry); if (!state.current) return panel; }
  const data = state.result ?? { points: [], segments: [], warnings: [] };
  if(data.points.length===1)panel.append(node('p',t('history.singleObservation'),'history-availability'));
  if (data.warnings?.length) { panel.append(node('p', t("일부 기록이 누락되거나 조회에 실패했습니다. 표시된 관측값만 확인하세요."), 'history-warning')); const retry = node('button',t("이력 다시 확인")); retry.dataset.action = 'history-retry'; panel.append(retry); }
  if (!data.points.length) panel.append(node('p',t("기록 수집 중"), 'history-empty'));
  else {
    const scale = historyScale(data.points);
    const graph = node('div', undefined, 'history-graph'), axis = node('div', undefined, 'history-y'); axis.setAttribute('aria-hidden','true');
    for (const rate of scale.ticks) axis.append(node('span',`${formatHistoryRate(rate)}%`));
    const plot = svg('svg',{viewBox:'0 0 600 180',preserveAspectRatio:'none',role:'group','aria-label':t("message.9637e9fb6aba",{"0":(label),"1":(scale.min),"2":(scale.max)})});
    const first = data.points[0].time, last = data.points.at(-1).time;
    const yearBoundary=new Date(first+9*3600000).getUTCFullYear()!==new Date(last+9*3600000).getUTCFullYear();
    let plotMargin=yearBoundary?44:24;
    const x = p => first === last ? 300 : plotMargin + (p.time-first)/(last-first)*(600-2*plotMargin);
    const y = p => 12 + (scale.max-rate(p))/(scale.max-scale.min)*156;
    prepareChartMotion(panel,['history',filters,state.metric,state.days,data.points.map(p=>[p.time,rate(p),p.stored,p.current]),data.segments,data.comparisonSegments]);
    for (const tick of scale.ticks) { const yy = y({value:tick}); plot.append(svg('line',{x1:0,y1:yy,x2:600,y2:yy,class:'history-grid-line'})); }
    const trace=svg('g',{class:'history-trace'});
    for (const [a,b] of data.segments) trace.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-segment','data-connection':'observation-guide','data-patch-boundary':'false','vector-effect':'non-scaling-stroke'}));
    for (const [a,b] of data.comparisonSegments??[]) trace.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-comparison','data-connection':'patch-window-comparison','data-patch-boundary':String(a.sourcePatch!==b.sourcePatch),'vector-effect':'non-scaling-stroke'}));
    plot.append(trace);
    const selected = node('p', '', 'history-observation sr-only'); selected.setAttribute('role','status'); selected.setAttribute('aria-live','polite');
    const provenance=p=>(p.current?(p.stored?t("저장 이력 + 현재 조회"):t("현재 조회 · 저장 안 됨")):t("저장 이력"))+(p.composite?t(" · HOW 등급 균등 평균"):'');
    const description=p=>`${stamp(p.collectedAt)} (KST) · ${label} ${formatHistoryRate(rate(p))}% · ${provenance(p)}${p.patch&&p.verificationStatus==='verified' ? t("message.37981ca724d6",{"0":(translateLabel(p.patchLabel??p.patch)),"1":(p.representative?t(" · 패치 대표값"):'')}) : t(" · 패치 미확인")}`;
    let selectedIndex=-1;
    function choose(index) { if(index===selectedIndex)return;selectedIndex=index;const p = data.points[index]; selected.textContent = `${stamp(p.collectedAt)} · ${label} ${formatHistoryRate(rate(p))}% · ${p.current&&!p.stored?t("현재 조회"):t("저장")}`; selected.title = description(p); plot.querySelectorAll('.history-point').forEach((el,i)=>el.setAttribute('data-selected',String(i===index))); }
    const valueTip=valueTooltip(graph);
    const guide=svg('line',{class:'history-guide',y1:0,y2:180,visibility:'hidden'});plot.append(guide);
    const pointLabel=p=>`${formatHistoryRate(rate(p))}%`;
    const showPoint=index=>{choose(index);const mark=plot.querySelectorAll('.history-point')[index];valueTip.show(pointLabel(data.points[index]),mark.querySelector('.history-dot'));guide.setAttribute('x1',x(data.points[index]));guide.setAttribute('x2',x(data.points[index]));guide.setAttribute('visibility','visible');};
    graph.addEventListener('pointerleave',()=>guide.setAttribute('visibility','hidden'));
    graph.addEventListener('keydown',event=>{if(event.key==='Escape')guide.setAttribute('visibility','hidden');});
    graph.addEventListener('focusout',event=>{if(!graph.contains(event.relatedTarget))guide.setAttribute('visibility','hidden');});
    data.points.forEach((p,index)=>{
      const mark = svg('g',{class:'history-point',tabindex:0,role:'button','data-current':String(p.current===true),'data-storage':p.current?(p.stored?'both':'browser'):'stored','data-representative':String(p.representative===true),'aria-label':description(p)});
      const tooltip = svg('title',{}); tooltip.textContent = pointLabel(p);
      mark.append(tooltip,svg('ellipse',{cx:x(p),cy:y(p),rx:6,ry:6,class:'history-hit','vector-effect':'non-scaling-stroke'}),svg('ellipse',{cx:x(p),cy:y(p),rx:6,ry:6,class:'history-dot','vector-effect':'non-scaling-stroke'}));
      mark.addEventListener('click',()=>showPoint(index)); mark.addEventListener('focus',()=>showPoint(index)); mark.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();showPoint(index);}}); mark.addEventListener('pointerenter',()=>showPoint(index)); plot.append(mark);
    });
    plotLayouts.set(plot,({width,height})=>{
      plotMargin=Math.min(220,Math.max(20,(yearBoundary?44:24)*600/width));
      updateLabels(width);valueTip.hide();guide.setAttribute('visibility','hidden');
      const segments=[...data.segments,...(data.comparisonSegments??[])];
      plot.querySelectorAll('.history-segment,.history-comparison').forEach((line,i)=>{line.setAttribute('x1',x(segments[i][0]));line.setAttribute('x2',x(segments[i][1]));});
      plot.querySelectorAll('.history-point').forEach((mark,i)=>{
        for(const ellipse of mark.querySelectorAll('ellipse')){const radius=ellipse.classList.contains('history-hit')?22:4;ellipse.setAttribute('cx',x(data.points[i]));ellipse.setAttribute('rx',radius*600/width);ellipse.setAttribute('ry',radius*180/height);}
      });
    });plotObserver?.observe(plot);
    choose(data.points.length-1); graph.prepend(axis,plot);
    const labels=node('div',undefined,'history-x history-date-axis');labels.setAttribute('aria-hidden','true');
    function updateLabels(width=600){labels.replaceChildren();for(const item of historyDateLabels(data.points,width,plotMargin)){const text=node('span',item.text);text.style.left=`${item.x/6}%`;labels.append(text);}}
    updateLabels();
    const nearestPoint=event=>{const rect=plot.getBoundingClientRect();if(!rect.width)return;const position=(event.clientX-rect.left)/rect.width*600;let nearest=0;data.points.forEach((p,i)=>{if(Math.abs(x(p)-position)<Math.abs(x(data.points[nearest])-position))nearest=i;});showPoint(nearest);};
    plot.addEventListener('pointermove',nearestPoint);plot.addEventListener('click',event=>{if(event.detail)nearestPoint(event);});
    panel.append(graph,labels,selected);
    const lastPoint=data.points.reduce((a,b)=>a.time>b.time?a:b),observedAt=formatHistoryTimestamp(lastPoint.collectedAt??lastPoint.time);
    if(observedAt)panel.append(node('p',t('dashboard.lastObservation',{time:observedAt.replace(/ KST$/,'')}),'history-last-observed'));
    const info=node('div',undefined,'history-info');
    if(data.points.some(p=>p.verificationStatus==='verified'))info.append(node('p',t("패치 후 첫 관측이며, 안정된 메타를 뜻하지 않습니다."),'history-observation'));
    if(info.childElementCount)panel.append(info);
    const disclosure = node('div', undefined, 'history-records sr-only');
    const table = node('table',undefined,'history-table'); table.append(node('caption',t("message.8c4050efe53c",{"0":(label)})));
    const header = node('tr'); for(const text of [t("관측 시각 (한국)"),label]) {const th=node('th',text);th.scope='col';header.append(th);} const thead=node('thead');thead.append(header);table.append(thead);
    const body=node('tbody'); for(const point of data.points){const tr=node('tr');tr.append(node('td',stamp(point.collectedAt)),node('td',`${formatHistoryRate(rate(point))}%`));body.append(tr);}table.append(body);disclosure.append(table);panel.append(disclosure);
  }
  return panel;
}
export const renderMetricHistory = renderPickHistory;
