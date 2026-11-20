import {t,formatLocale} from '../i18n/i18n.js';
import {errorText} from '../i18n/i18n.js';
import {node} from './dom.js';
import {prepareChartMotion} from './chartMotion.js';
import {MAP_NAMES} from '../models/mapModel.js';
import {buildMapComparison} from '../models/mapComparisonModel.js';
import {HISTORY_LABELS} from './pickHistoryView.js';
import {formatPercentage,formatPercentagePoints} from './statisticsUI.js';
function information(data,names){
 const info=node('div',undefined,'history-info');
 for(const [i,frame]of [data.baseline,data.current].entries())if(frame&&Number.isFinite(Date.parse(frame.fetchedAt)))info.append(node('p',`${names[i]} · ${new Date(frame.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'})}`));
 return info;
}
export function renderMapStatistics(state,model,heroKey,{metric='pickRate'}={}){
 const data=buildMapComparison(state,model.state,heroKey,metric),label=HISTORY_LABELS[metric];
 const panel=node('section',undefined,'pick-history map-comparison');panel.id='pick-history';panel.dataset.comparisonState=data.status;panel.setAttribute('aria-labelledby','pick-history-title');
 const heading=node('div',undefined,'history-heading'),title=node('h2',t('map.chartTitle',{metric:label}));title.id='pick-history-title';heading.append(title);panel.append(heading);
 const retry=()=>{const button=node('button',t('다시 시도'));button.type='button';button.dataset.mapStatsRetry='true';button.dataset.action=model.state.statistics?.stale||['error','stale'].includes(model.state.statsStatus)?'stats-refresh':'map-stats-retry';panel.append(button);};
 if(data.status==='loading'){panel.setAttribute('aria-busy','true');panel.append(node('p',t('비교 통계를 불러오는 중'),'map-comparison-empty'));return panel;}
 if(data.status==='error'){panel.append(node('p',errorText(data.error),'map-comparison-empty'));retry();return panel;}
 if(data.status==='incompatible'){panel.append(node('p',t('map.incompatible'),'map-comparison-empty'));return panel;}
 const names=[t('전체 전장'),MAP_NAMES[data.filters.map]??data.filters.map];
 if(data.status==='missing'){panel.append(node('p',data.statuses.includes('review')?t('map.review'):t('해당 맵 통계 미제공'),'map-comparison-empty'),information(data,names));return panel;}
 const chart=node('div',undefined,'map-compare-chart'),axis=node('div',undefined,'map-compare-axis');axis.setAttribute('aria-hidden','true');
 prepareChartMotion(panel,['map',data.filters,metric,data.values,data.max]);
 for(const value of [data.max,data.max/2,0])axis.append(node('span',formatPercentage(value,2)));
 const bars=node('div',undefined,'map-bars');
 for(let i=0;i<2;i++){
  const column=node('figure',undefined,'map-column'),value=data.values[i];column.dataset.series=i?'selected':'all';
  column.append(node('strong',Number.isFinite(value)?formatPercentage(value,2):data.statuses[i]==='review'?t('검토 중'):t('미제공'),'map-value'));
  const track=node('div',undefined,'map-bar-track');track.setAttribute('aria-hidden','true');
  if(Number.isFinite(value)){const bar=node('div',undefined,'map-bar');bar.style.height=`${value/data.max*100}%`;track.append(bar);column.title=t('map.raw',{value});}
  column.append(track,node('figcaption',names[i]));bars.append(column);
 }
 chart.append(axis,bars);panel.append(chart,node('p',t('map.delta',{difference:formatPercentagePoints(data.difference)}),'map-difference'));
 if(data.statuses.includes('review'))panel.append(node('p',t('map.review'),'history-warning'));
 if(['missing','confirmed-missing'].includes(data.statuses[1]))panel.append(node('p',t('해당 맵 통계 미제공'),'history-warning'));
 if(['missing','confirmed-missing'].includes(data.statuses[0]))panel.append(node('p',t('map.baselineMissing'),'history-warning'));
 if(data.warnings.includes('stale')){panel.append(node('p',t('오래된 데이터'),'history-warning'));retry();}
 if(data.warnings.includes('different-time')||data.warnings.includes('unknown-time'))panel.append(node('p',t('map.timeWarning'),'history-warning'));
 panel.append(information(data,names));return panel;
}
