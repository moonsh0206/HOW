import {formatLocale} from '../i18n/i18n.js';
import {t,label as translateLabel} from '../i18n/i18n.js';
import { node } from './dom.js';
export const HISTORY_LABELS = Object.freeze({ winRate: t("승률"), pickRate: t("픽률"), banRate: t("밴률") });
const rate = point => point.value ?? point.pickRate;
export const formatHistoryRate = value => Number.isFinite(value) ? value.toFixed(1) : '—';
const stamp = value => new Date(value).toLocaleString(formatLocale(), { timeZone: 'Asia/Seoul', hour12: false });
const day = value => new Date(value).toLocaleString(formatLocale(), { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
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
    panel.append(node('strong', t("message.825cd15bfedc",{"0":(label),"1":(formatHistoryRate(rate(state.current)))}), 'history-current'));
    if (state.current.stale) panel.append(node('p',t("오래된 데이터"), 'history-warning'));
  }
  if (state.status === 'loading') { panel.setAttribute('aria-busy','true'); panel.append(node('p',t("불러오는 중"))); if (!state.current) return panel; }
  if (state.status === 'error') { panel.append(node('p',t("message.01d57da2f363",{"0":(label)}), 'history-warning')); const retry = node('button',t("다시 시도")); retry.dataset.action = 'history-retry'; panel.append(retry); if (!state.current) return panel; }
  const data = state.result ?? { points: [], segments: [], warnings: [] };
  if(data.points.length&&data.points.filter(p=>p.stored).length<2)panel.append(node('p',t("저장 이력 부족 · 변화 비교를 위한 기록 수집 중"),'history-availability'));
  if (data.warnings?.length) { panel.append(node('p', t("일부 기록이 누락되거나 조회에 실패했습니다. 표시된 관측값만 확인하세요."), 'history-warning')); const retry = node('button',t("이력 다시 확인")); retry.dataset.action = 'history-retry'; panel.append(retry); }
  if (!data.points.length) panel.append(node('p',t("기록 수집 중"), 'history-empty'));
  else {
    const scale = historyScale(data.points);
    const graph = node('div', undefined, 'history-graph'), axis = node('div', undefined, 'history-y'); axis.setAttribute('aria-hidden','true');
    for (const rate of scale.ticks) axis.append(node('span',`${formatHistoryRate(rate)}%`));
    const plot = svg('svg',{viewBox:'0 0 600 180',preserveAspectRatio:'none',role:'group','aria-label':t("message.9637e9fb6aba",{"0":(label),"1":(scale.min),"2":(scale.max)})});
    const first = data.points[0].time, last = data.points.at(-1).time;
    let plotMargin=20;
    const x = p => first === last ? 300 : plotMargin + (p.time-first)/(last-first)*(600-2*plotMargin);
    const y = p => 12 + (scale.max-rate(p))/(scale.max-scale.min)*156;
    for (const tick of scale.ticks) { const yy = y({value:tick}); plot.append(svg('line',{x1:0,y1:yy,x2:600,y2:yy,class:'history-grid-line'})); }
    for (const [a,b] of data.segments) plot.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-segment','vector-effect':'non-scaling-stroke'}));
    for (const [a,b] of data.comparisonSegments??[]) plot.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-comparison','vector-effect':'non-scaling-stroke'}));
    const selected = node('p', '', 'history-observation'); selected.setAttribute('role','status'); selected.setAttribute('aria-live','polite');
    const provenance=p=>(p.current?(p.stored?t("저장 이력 + 현재 조회"):t("현재 조회 · 저장 안 됨")):t("저장 이력"))+(p.composite?t(" · HOW 등급 균등 평균"):'');
    const description=p=>`${stamp(p.collectedAt)} (KST) · ${label} ${formatHistoryRate(rate(p))}% · ${provenance(p)}${p.patch&&p.verificationStatus==='verified' ? t("message.37981ca724d6",{"0":(translateLabel(p.patchLabel??p.patch)),"1":(p.representative?t(" · 패치 대표값"):'')}) : t(" · 패치 미확인")}`;
    function choose(index) { const p = data.points[index]; selected.textContent = `${stamp(p.collectedAt)} · ${label} ${formatHistoryRate(rate(p))}% · ${p.current&&!p.stored?t("현재 조회"):t("저장")}`; selected.title = description(p); plot.querySelectorAll('.history-point').forEach((el,i)=>el.setAttribute('data-selected',String(i===index))); }
    data.points.forEach((p,index)=>{
      const mark = svg('g',{class:'history-point',tabindex:0,role:'button','data-storage':p.current?(p.stored?'both':'browser'):'stored','data-representative':String(p.representative===true),'aria-label':description(p)});
      const tooltip = svg('title',{}); tooltip.textContent = description(p);
      mark.append(tooltip,svg('ellipse',{cx:x(p),cy:y(p),rx:6,ry:6,class:'history-hit','vector-effect':'non-scaling-stroke'}),svg('ellipse',{cx:x(p),cy:y(p),rx:6,ry:6,class:'history-dot','vector-effect':'non-scaling-stroke'}));
      mark.addEventListener('click',()=>choose(index)); mark.addEventListener('focus',()=>choose(index)); mark.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();choose(index);}}); plot.append(mark);
    });
    plotLayouts.set(plot,({width,height})=>{
      plotMargin=Math.min(220,Math.max(20,24*600/width));
      const segments=[...data.segments,...(data.comparisonSegments??[])];
      plot.querySelectorAll('.history-segment,.history-comparison').forEach((line,i)=>{line.setAttribute('x1',x(segments[i][0]));line.setAttribute('x2',x(segments[i][1]));});
      plot.querySelectorAll('.history-point').forEach((mark,i)=>{
        for(const ellipse of mark.querySelectorAll('ellipse')){const radius=ellipse.classList.contains('history-hit')?22:4;ellipse.setAttribute('cx',x(data.points[i]));ellipse.setAttribute('rx',radius*600/width);ellipse.setAttribute('ry',radius*180/height);}
      });
    });plotObserver?.observe(plot);
    choose(data.points.length-1); graph.append(axis,plot);
    const axisLabel = p => p.patchLabel&&p.verificationStatus==='verified' ? `${translateLabel(p.patchLabel)}${p.ongoing?t(" · 진행 중"):''}` : `${p.current?t("현재 조회"):t("저장")} · ${day(p.collectedAt)}`;
    const labels = node('div', undefined, 'history-x'); labels.setAttribute('aria-hidden','true'); labels.append(node('span',axisLabel(data.points[0])));
    if (data.points.length > 1) labels.append(node('span',axisLabel(data.points.at(-1)))); else labels.classList.add('history-x-single');
    panel.append(graph,labels,selected);
    const info=node('details',undefined,'history-info'); info.append(node('summary',t("관측 정보")));
    if(data.points.some(p=>p.current&&!p.stored)&&data.points.some(p=>p.stored))info.append(node('p',t("채운 점: 저장 · 테두리 점: 현재 조회(미저장)"),'history-observation'));
    if(data.comparisonSegments?.length)info.append(node('p',t("점선은 관측값 비교이며 원본 집계 기간이 다를 수 있습니다. 중간 날짜의 값은 제공하지 않습니다."),'history-observation'));
    if(data.points.some(p=>p.verificationStatus==='verified'))info.append(node('p',t("패치 후 첫 관측이며, 안정된 메타를 뜻하지 않습니다."),'history-observation'));
    info.append(node('p',t("시각은 HOW 관측 기준입니다. 원본 경기 집계 시각과 다르며 패치 미확인 자료는 일반 관측으로 표시합니다."),'history-observation'));panel.append(info);
    const disclosure = node('div', undefined, 'history-records sr-only');
    const table = node('table',undefined,'history-table'); table.append(node('caption',t("message.8c4050efe53c",{"0":(label)})));
    const header = node('tr'); for(const text of [t("관측 시각 (한국)"),label]) {const th=node('th',text);th.scope='col';header.append(th);} const thead=node('thead');thead.append(header);table.append(thead);
    const body=node('tbody'); for(const point of data.points){const tr=node('tr');tr.append(node('td',stamp(point.collectedAt)),node('td',`${formatHistoryRate(rate(point))}%`));body.append(tr);}table.append(body);disclosure.append(table);panel.append(disclosure);
  }
  return panel;
}
export const renderMetricHistory = renderPickHistory;
