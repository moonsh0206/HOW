import { node } from './dom.js';
import { filterLabel,statisticsQuery } from '../models/statisticsModel.js';
export function renderMapStatistics(state,model,heroKey) {
  const panel=node('section',undefined,'map-statistics');panel.id='map-statistics';panel.setAttribute('aria-labelledby','map-statistics-title');
  const heading=node('h2','맵별 통계');heading.id='map-statistics-title';
  panel.append(heading);
  const retry=()=>{const button=node('button','다시 시도');button.type='button';button.dataset.action='map-stats-retry';panel.append(button);};
  const selectedFilters={...model.state.statsFilters},baseFilters={...selectedFilters,map:'all'};
  if(selectedFilters.map==='all'){panel.append(node('p','상단 전장 필터에서 전장을 선택하면 전체 전장과 비교합니다.','map-statistics-note'));return panel;}
  if(state.status==='loading'||model.state.statsStatus==='loading'){panel.setAttribute('aria-busy','true');panel.append(node('p','비교 통계를 불러오는 중','map-statistics-note'));return panel;}
  if(state.status==='error'){panel.append(node('p',state.error,'map-statistics-note'));retry();}
  const baseline=state.baseline,base=baseline?.filters&&statisticsQuery(baseline.filters)===statisticsQuery(baseFilters)?baseline.records.find(row=>row.hero===heroKey):null;
  const result=model.state.statistics,row=result?.filters&&statisticsQuery(result.filters)===statisticsQuery(selectedFilters)?result.records.find(row=>row.hero===heroKey):null;
  const percent=value=>value==null?'미제공':`${value}%`;
  const diff=base?.winRate!=null&&row?.winRate!=null?row.winRate-base.winRate:null;
  const grid=node('dl',undefined,'map-statistics-metrics');
  for(const [title,value] of [['전체 맵 승률',percent(base?.winRate)],['선택 맵 승률',percent(row?.winRate)],['승률 차이',diff==null?'미제공':`${diff>0?'+':''}${diff.toFixed(1)}%p`],['선택 맵 픽률',percent(row?.pickRate)],['선택 맵 밴률',percent(row?.banRate)]]){const group=node('div');group.append(node('dt',title),node('dd',value));grid.append(group);}
  panel.append(grid);
  if(!row||[row.winRate,row.pickRate,row.banRate].every(v=>v==null))panel.append(node('p','해당 맵 통계 미제공','map-statistics-note'));
  panel.append(node('p',`${filterLabel(selectedFilters)} · OverFast API · 조회 ${result?.fetchedAt?new Date(result.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미제공'}${result?.stale?' · 오래된 데이터 / 갱신 실패':''}`, 'map-statistics-note'));
  if(baseline?.stale)panel.append(node('p','전체 맵 기준은 오래된 데이터입니다.','map-statistics-note'));
  if(result?.stale)retry();
  return panel;
}
