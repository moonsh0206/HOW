import { node } from './dom.js';
import { filterLabel } from '../models/statisticsModel.js';
const stamp = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
const day = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function svg(tag, attributes) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key,value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}
export function renderPickHistory(state = { status: 'idle', days: 7 }, filters) {
  const panel = node('section', undefined, 'pick-history'); panel.id = 'pick-history'; panel.setAttribute('aria-labelledby', 'pick-history-title');
  const head = node('div', undefined, 'history-heading'), title = node('h2', '픽률 변화 추이'); title.id = 'pick-history-title';
  const controls = node('div', undefined, 'history-controls'); controls.setAttribute('role','group'); controls.setAttribute('aria-label','픽률 이력 기간');
  for (const days of [7,30]) { const button = node('button', `${days}일`); button.type = 'button'; button.dataset.historyDays = days; button.setAttribute('aria-pressed', String((state.days ?? 7) === days)); controls.append(button); }
  const seasonLabel = node('label', '시즌 '), season = node('select'); season.disabled = true; season.setAttribute('aria-label','시즌별 비교'); season.title = '시즌 경계·패치·집계 분모가 검증된 기록이 없습니다.'; season.append(node('option','비교 미제공')); seasonLabel.append(season); controls.append(seasonLabel);
  head.append(title, controls); panel.append(head, node('p', filterLabel(filters), 'history-source'));
  if (state.status === 'loading') { panel.setAttribute('aria-busy','true'); panel.append(node('p','픽률 이력을 불러오는 중입니다.')); return panel; }
  if (state.status === 'error') { panel.append(node('p',`픽률 이력을 불러오지 못했습니다. ${state.error ?? ''}`, 'history-warning')); const retry = node('button','다시 시도'); retry.dataset.action = 'history-retry'; panel.append(retry); return panel; }
  const data = state.result ?? { points: [], segments: [], warnings: [] };
  if (data.warnings?.length) { panel.append(node('p', '일부 기록이 누락되거나 조회에 실패했습니다. 표시된 관측값만 확인하세요.', 'history-warning')); const retry = node('button','이력 다시 확인'); retry.dataset.action = 'history-retry'; panel.append(retry); }
  if (!data.points.length) { panel.append(node('p','아직 수집된 픽률 이력이 없습니다.', 'history-empty')); }
  else {
    if (data.points.length === 1) panel.append(node('p','픽률 변화를 기록 중입니다.', 'history-empty'));
    const graph = node('div', undefined, 'history-graph'), axis = node('div', undefined, 'history-y'); axis.setAttribute('aria-hidden','true');
    for (const rate of [100,75,50,25,0]) axis.append(node('span',`${rate}%`));
    const plot = svg('svg',{viewBox:'0 0 600 180',preserveAspectRatio:'none',role:'group','aria-label':'HOW 관측 시점별 픽률. 관측점을 선택하면 정확한 값을 확인합니다.'});
    const first = data.points[0].time, last = data.points.at(-1).time;
    const x = p => first === last ? 300 : 20 + (p.time-first)/(last-first)*560;
    const y = p => 12 + (100-p.pickRate)/100*156;
    for (const rate of [0,25,50,75,100]) { const yy = 12+(100-rate)/100*156; plot.append(svg('line',{x1:0,y1:yy,x2:600,y2:yy,class:'history-grid-line'})); }
    for (const [a,b] of data.segments) plot.append(svg('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),class:'history-segment','vector-effect':'non-scaling-stroke'}));
    const selected = node('p', '', 'history-observation'); selected.setAttribute('role','status'); selected.setAttribute('aria-live','polite');
    function choose(index) { const p = data.points[index]; selected.textContent = `${stamp(p.collectedAt)} (한국 시각) · 픽률 ${p.pickRate}% · 패치 ${p.patch ?? '미제공'}`; plot.querySelectorAll('.history-point').forEach((el,i)=>el.setAttribute('data-selected',String(i===index))); }
    data.points.forEach((p,index)=>{
      const mark = svg('g',{class:'history-point',tabindex:0,role:'button','aria-label':`${stamp(p.collectedAt)} 픽률 ${p.pickRate}%`});
      const tooltip = svg('title',{}); tooltip.textContent = `${stamp(p.collectedAt)} · ${p.pickRate}%`;
      mark.append(tooltip,svg('circle',{cx:x(p),cy:y(p),r:4,class:'history-hit','vector-effect':'non-scaling-stroke'}),svg('circle',{cx:x(p),cy:y(p),r:4,class:'history-dot','vector-effect':'non-scaling-stroke'}));
      mark.addEventListener('click',()=>choose(index)); mark.addEventListener('focus',()=>choose(index)); mark.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();choose(index);}}); plot.append(mark);
    });
    choose(data.points.length-1); graph.append(axis,plot);
    const labels = node('div', undefined, 'history-x'); labels.setAttribute('aria-hidden','true'); labels.append(node('span',day(data.points[0].collectedAt)),node('span',day(data.points.at(-1).collectedAt)));
    panel.append(graph,labels,selected);
    const disclosure = node('details', undefined, 'history-records'); disclosure.append(node('summary',`관측 데이터 보기 (${data.points.length}개)`));
    const table = node('table',undefined,'history-table'); table.append(node('caption','HOW가 관측한 시각의 픽률 · 일별 집계가 아닙니다.'));
    const header = node('tr'); for(const label of ['수집 시각 (한국)','픽률','패치']) {const th=node('th',label);th.scope='col';header.append(th);} const thead=node('thead');thead.append(header);table.append(thead);
    const body=node('tbody'); for(const point of data.points){const tr=node('tr');tr.append(node('td',stamp(point.collectedAt)),node('td',`${point.pickRate}%`),node('td',point.patch??'미제공'));body.append(tr);}table.append(body);disclosure.append(table);panel.append(disclosure);
  }
  panel.append(node('p','출처: OverFast API · HOW가 저장한 실제 관측 기록입니다. 해당 시각의 픽률이며 그날 하루의 픽률이 아닙니다. 누락 날짜는 채우지 않습니다.', 'history-source'),node('p','동일한 확인된 패치·24시간 이내의 연속 관측만 참고선으로 연결합니다. 패치 미상·경계·누락 구간은 연결하지 않으며 선 사이 시각의 값은 제공하지 않습니다.', 'history-source'));
  return panel;
}
