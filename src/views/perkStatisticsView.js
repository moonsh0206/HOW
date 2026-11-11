import {errorText} from '../i18n/i18n.js';
import {formatLocale} from '../i18n/i18n.js';
import {t} from '../i18n/i18n.js';
import {node} from './dom.js';
import {PERK_SOURCE_URL} from '../models/perkSelectionModel.js';
const missing=state=>['loading','idle'].includes(state.status)?t("특전 선택률 조회 중"):state.status==='error'?t("특전 통계를 불러오지 못했습니다"):t("OverLooker 선택률 데이터 미제공");
export function renderPerkSelection(item,state){
 const box=node('div',undefined,'perk-selection');box.setAttribute('aria-live','polite');
 const entry=item.selection;
 if(!entry||entry.status!=='ready'||entry.selectionRate==null){box.append(node('p',entry?.status==='mapping-review'||entry?.status==='inactive'?t("선택률 매핑 검토 중"):missing(state),'perk-selection-status'));return box;}
 const label=t("message.3c4a094d1e07",{"0":(item.name),"1":(entry.selectionRate.toFixed(2))});
 const heading=node('div',undefined,'perk-selection-heading');heading.append(node('strong',`${entry.selectionRate.toFixed(2)}%`));
 if(entry.selectionCount!==null)heading.append(node('span',t("message.fbf6cdbcd616",{"0":(entry.selectionCount.toLocaleString(formatLocale()))})));box.append(heading);
 const bar=node('div',undefined,'perk-selection-bar');bar.setAttribute('role','meter');bar.setAttribute('aria-label',label);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(entry.selectionRate));bar.setAttribute('aria-valuetext',label);
 const fill=node('span');fill.style.width=`${entry.selectionRate}%`;bar.append(fill);box.append(bar);return box;
}
export function renderPerkStatisticsInfo(state){
 const section=node('footer',undefined,'perk-statistics-info');section.id='detail-perk-rates';section.setAttribute('aria-label',t("특전 통계 출처"));
 if(['error','unavailable'].includes(state.status))section.append(node('p',missing(state),'perk-selection-status'));
 if(state.status==='error'){const retry=node('button',t("다시 시도"),'text-link');retry.type='button';retry.dataset.action='perk-stats-retry';section.append(retry);
  const info=node('details');info.append(node('summary',t("연결 정보")),node('p',errorText(state.error)??t("네트워크 연결을 확인해 주세요.")));section.append(info);}
 const link=node('a',t("특전 선택 통계 제공: OverLooker ↗"));link.href=PERK_SOURCE_URL;link.target='_blank';link.rel='noopener noreferrer';section.append(link);
 if(state.result){const f=state.result.filters;
  if(state.result.collectedAt)section.append(node('p',t("message.5e3baf1380fd",{"0":(new Date(state.result.collectedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}))}),'perk-collected-at'));
  else if(state.result.fetchedAt)section.append(node('p',t("message.9ee275f94d0e",{"0":(new Date(state.result.fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}))})));
  if(f?.queue_type||f?.since)section.append(node('p',t("message.96a52d11b54c",{"0":(f.queue_type==='COMPETITIVE'?t("경쟁전"):f.queue_type==='QUICKPLAY'?t("빠른 대전"):t("모드 미지정")),"1":(f.since?t("message.4c7571ae1dc8",{"0":(f.since)}):'')})));}
 section.append(node('p',t("OverLooker 제공 집계이며, HOW 지역·등급·전장·모드 필터와 독립된 통계입니다. HOW 자체 집계가 아니며 선택 건수는 경기 수가 아닙니다.")));
 return section;
}
