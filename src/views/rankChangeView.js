import {t,formatLocale} from '../i18n/i18n.js';
import {node} from './dom.js';
// Shared by the dashboard and both hero-list layouts; calculation stays in Models.
export function rankChangeMarker(change){
 const delta=change.delta,marker=node('small',delta>0?`▲${delta}`:delta<0?`▼${-delta}`:'=',`rank-change ${delta>0?'rank-up':delta<0?'rank-down':'rank-equal'}`);
 const date=value=>new Date(value).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'});
 const text=change.basis==='daily-observation'?t('rank.dailyPositions',{previousRank:change.previousRank,currentRank:change.currentRank,previous:date(change.previousAt),current:date(change.currentAt)}):t('rank.daily',{previous:change.previousAt,current:change.currentAt});
 marker.tabIndex=0;marker.setAttribute('role','img');marker.setAttribute('aria-label',`${text}: ${delta>0?'+':''}${delta}`);marker.title=text;
 // CSS exposes the same concise observation basis to keyboard users.
 marker.dataset.tooltip=text;
 return marker;
}
