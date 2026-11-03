import { node } from './dom.js';
const stamp = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
const day = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function svg(tag, attributes) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key,value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}
// At least 10 percentage points: small changes must not fill the entire plot.
export function historyScale(points) {
  const values = points.map(point => point.pickRate);
  const low = Math.min(...values), high = Math.max(...values);
  const padding = Math.max(2, (high - low) * 0.2);
  let min = Math.max(0, Math.floor((low - padding) / 2) * 2);
  let max = Math.min(100, Math.ceil((high + padding) / 2) * 2);
  if (max - min < 10) { max = Math.min(100, min + 10); min = Math.max(0, max - 10); }
  return { min, max, ticks: Array.from({ length: 5 }, (_, i) => max - (max - min) * i / 4) };
}
export function renderPickHistory(state = { status: 'idle', days: 7 }, filters) {
  const panel = node('section', undefined, 'pick-history'); panel.id = 'pick-history'; panel.setAttribute('aria-labelledby', 'pick-history-title');
  const head = node('div', undefined, 'history-heading'), title = node('h2', '픽률 변화 추이'); title.id = 'pick-history-title';
  const controls = node('div', undefined, 'history-controls'); controls.setAttribute('role','group'); controls.setAttribute('aria-label','픽률 이력 기간');
  for (const days of [7,30]) { const button = node('button', `${days}일`); button.type = 'button'; button.dataset.historyDays = days; button.setAttribute('aria-pressed', String((state.days ?? 7) === days)); controls.append(button); }
  head.append(title, controls); panel.append(head);
  if (state.current) {
    panel.append(node('strong', `현재 픽률 ${state.current.pickRate}%`, 'history-current'));
    if (state.current.stale) panel.append(node('p','오래된 데이터', 'history-warning'));
  }
  if (state.status === 'loading') { panel.setAttribute('aria-busy','true'); panel.append(node('p','픽률 이력을 불러오는 중입니다.')); if (!state.current) return panel; }
  if (state.status === 'error') { panel.append(node('p',`픽률 이력을 불러오지 못했습니다. ${state.error ?? ''}`, 'history-warning')); const retry = node('button','다시 시도'); retry.dataset.action = 'history-retry'; panel.append(retry); if (!state.current) return panel; }
  const data = state.result ?? { points: [], segments: [], warnings: [] };
  if (data.warnings?.length) { panel.append(node('p', '일부 기록이 누락되거나 조회에 실패했습니다. 표시된 관측값만 확인하세요.', 'history-warning')); const retry = node('button','이력 다시 확인'); retry.dataset.action = 'history-retry'; panel.append(retry); }
  if (!data.points.length) panel.append(node('p','기록 수집 중', 'history-empty'));
  else {
    const scale = historyScale(data.points);
    const graph = node('div', undefined, 'history-graph'), axis = node('div', undefined, 'history-y'); axis.setAttribute('aria-hidden','true');
    for (const rate of scale.ticks) axis.append(node('span',`${rate}%`));
    const plot = svg('svg',{viewBox:'0 0 600 180',preserveAspectRatio:'none',role:'group','aria-label':'HOW 관측 시점별 픽률. 관측점을 선택하면 정확한 값을 확인합니다.'});
    const first = data.points[0].time, last = data.points.at(-1).time;
    const x = p => first === last ? 300 : 20 + (p.time-first)/(last-first)*560;
    const y = p => 12 + (scale.max-p.pickRate)/(scale.max-scale.min)*156;
    for (const rate of scale.ticks) { const yy = y({pickRate:rate}); plot.append(svg('line',{x1:0,y1:yy,x2:600,y2:yy,class:'history-grid-line'})); }
    for (const [a,b] of data.segments) plot.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-segment','vector-effect':'non-scaling-stroke'}));
    const selected = node('p', '', 'history-observation'); selected.setAttribute('role','status'); selected.setAttribute('aria-live','polite');
    function choose(index) { const p = data.points[index]; selected.textContent = `${stamp(p.collectedAt)} (KST) · 픽률 ${p.pickRate}%`; plot.querySelectorAll('.history-point').forEach((el,i)=>el.setAttribute('data-selected',String(i===index))); }
    data.points.forEach((p,index)=>{
      const mark = svg('g',{class:'history-point',tabindex:0,role:'button','aria-label':`${stamp(p.collectedAt)} 픽률 ${p.pickRate}%`});
      const tooltip = svg('title',{}); tooltip.textContent = `${stamp(p.collectedAt)} · ${p.pickRate}%`;
      mark.append(tooltip,svg('circle',{cx:x(p),cy:y(p),r:6,class:'history-hit','vector-effect':'non-scaling-stroke'}),svg('circle',{cx:x(p),cy:y(p),r:6,class:'history-dot','vector-effect':'non-scaling-stroke'}));
      mark.addEventListener('click',()=>choose(index)); mark.addEventListener('focus',()=>choose(index)); mark.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();choose(index);}}); plot.append(mark);
    });
    choose(data.points.length-1); graph.append(axis,plot);
    const labels = node('div', undefined, 'history-x'); labels.setAttribute('aria-hidden','true'); labels.append(node('span',day(data.points[0].collectedAt)));
    if (data.points.length > 1) labels.append(node('span',day(data.points.at(-1).collectedAt))); else labels.classList.add('history-x-single');
    panel.append(graph,labels,selected);
    const disclosure = node('div', undefined, 'history-records sr-only');
    const table = node('table',undefined,'history-table'); table.append(node('caption','HOW가 관측한 시각의 픽률 · 일별 집계가 아닙니다.'));
    const header = node('tr'); for(const label of ['수집 시각 (한국)','픽률','패치']) {const th=node('th',label);th.scope='col';header.append(th);} const thead=node('thead');thead.append(header);table.append(thead);
    const body=node('tbody'); for(const point of data.points){const tr=node('tr');tr.append(node('td',stamp(point.collectedAt)),node('td',`${point.pickRate}%`),node('td',point.patch??'미제공'));body.append(tr);}table.append(body);disclosure.append(table);panel.append(disclosure);
  }
  return panel;
}
