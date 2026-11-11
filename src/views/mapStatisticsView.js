import {errorText} from '../i18n/i18n.js';
import {formatLocale} from '../i18n/i18n.js';
import {t} from '../i18n/i18n.js';
import { node } from './dom.js';
import { filterLabel,statisticsQuery } from '../models/statisticsModel.js';
import {rateStatus} from '../models/statisticsQuality.js';
export function renderMapStatistics(state,model,heroKey) {
  const panel=node('section',undefined,'map-statistics');panel.id='map-statistics';panel.setAttribute('aria-labelledby','map-statistics-title');
  const heading=node('h2',t("맵별 통계"));heading.id='map-statistics-title';
  panel.append(heading);
  const retry=()=>{const button=node('button',t("다시 시도"));button.type='button';button.dataset.action='map-stats-retry';panel.append(button);};
  const selectedFilters={...model.state.statsFilters},baseFilters={...selectedFilters,map:'all'};
  if(selectedFilters.map==='all'){panel.append(node('p',t("상단 전장 필터에서 전장을 선택하면 전체 전장과 비교합니다."),'map-statistics-note'));return panel;}
  if(state.status==='loading'||model.state.statsStatus==='loading'){panel.setAttribute('aria-busy','true');panel.append(node('p',t("비교 통계를 불러오는 중"),'map-statistics-note'));return panel;}
  if(state.status==='error'){panel.append(node('p',errorText(state.error),'map-statistics-note'));retry();}
  const baseline=state.baseline,base=baseline?.filters&&statisticsQuery(baseline.filters)===statisticsQuery(baseFilters)?baseline.records.find(row=>row.hero===heroKey):null;
  const result=model.state.statistics,row=result?.filters&&statisticsQuery(result.filters)===statisticsQuery(selectedFilters)?result.records.find(row=>row.hero===heroKey):null;
  const percent=value=>value==null?t("미제공"):`${value}%`;
  const diff=rateStatus(base,'winRate')==='available'&&rateStatus(row,'winRate')==='available'?row.winRate-base.winRate:null;
  const grid=node('dl',undefined,'map-statistics-metrics');
  for(const [title,value] of [[t("전체 맵 승률"),percent(base?.winRate)],[t("선택 맵 승률"),percent(row?.winRate)],[t("승률 차이"),diff==null?t("미제공"):`${diff>0?'+':''}${diff.toFixed(1)}%p`],[t("선택 맵 픽률"),percent(row?.pickRate)],[t("선택 맵 밴률"),percent(row?.banRate)]]){const group=node('div');group.append(node('dt',title),node('dd',value));grid.append(group);}
  panel.append(grid);
  if(rateStatus(base,'winRate')==='review'||rateStatus(row,'winRate')==='review')panel.append(node('p',t("승률 신뢰성 검토 중 · 승률 차이 산정 보류"),'map-statistics-note'));
  if(!row||[row.winRate,row.pickRate,row.banRate].every(v=>v==null))panel.append(node('p',t("해당 맵 통계 미제공"),'map-statistics-note'));
  panel.append(node('p',t("message.1109a1825e18",{"0":(filterLabel(selectedFilters)),"1":(result?.fetchedAt?new Date(result.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}):t("미제공")),"2":(result?.stale?t(" · 오래된 데이터 / 갱신 실패"):'')}), 'map-statistics-note'));
  if(baseline?.stale)panel.append(node('p',t("전체 맵 기준은 오래된 데이터입니다."),'map-statistics-note'));
  if(result?.stale)retry();
  return panel;
}
