import {compareHowTier} from './heroModel.js';
import {hotHeroes} from '../domain/insights.js';
import {rateStatus,statisticsNeedsReview} from './statisticsQuality.js';
import {statisticsQuery} from './statisticsModel.js';
import {validatedProvenance,OBSERVATION_TOLERANCE_MS} from './statisticsProvenance.js';
import {verifiedPatch} from './patchHistoryModel.js';
import {storedRankChanges} from './rankArchiveModel.js';
import {dailyRankChanges} from './dailyRankModel.js';
import {META_POLICY} from '../domain/meta.js';
import {meanRoleRecords,ROLE_MEAN_VERSION,ROLE_MEAN_METHOD} from './roleMeanModel.js';

export const DASHBOARD_ROLES=Object.freeze(['tank','damage','support']);
export function pickLeaders(heroes,metric='pickRate') {
  if(!['pickRate','winRate','banRate'].includes(metric))throw Error('Unsupported dashboard metric');
  return DASHBOARD_ROLES.map(role=>({role,hero:heroes.filter(h=>h.role===role&&!statisticsNeedsReview(h.statistics)&&rateStatus(h.statistics,metric)==='available').sort((a,b)=>b.statistics[metric]-a.statistics[metric]||a.key.localeCompare(b.key,'en'))[0]??null}));
}
export function dashboardSelection(model,role='all',metric='pickRate') {
  const state=model.state;
  let matches=false;try{matches=statisticsQuery(state.statistics?.filters)===statisticsQuery(state.statsFilters);}catch{}
  const current=state.statistics&&matches&&state.statsStatus==='ready'&&!state.statistics.stale?state.statistics:null;
  const heroes=model.enrichedHeroes(),sorted=heroes.filter(h=>role==='all'||h.role===role).sort(compareHowTier);
  const hot=hotHeroes(heroes,current,state.previousSnapshot);
  const spotlight=hot.heroes[0]??(current?heroes.filter(h=>h.tier&&h.metaScore!=null&&!statisticsNeedsReview(h.statistics)).sort(compareHowTier)[0]:null);
  let changes=new Map();
  if(current&&role!=='all'&&state.metaPolicy.version===META_POLICY.version){
    changes=state.dailyRankArchive?storedRankChanges({archive:state.dailyRankArchive,heroes:state.heroes,filters:state.statsFilters,role,sorted}):dailyRankChanges({snapshots:state.dailyRankSnapshots??[],heroes:state.heroes,filters:state.statsFilters,role});
    changes=new Map([...changes].filter(([key,c])=>c.basis==='daily-observation'||sorted.findIndex(h=>h.key===key)+1===c.currentRank));
  }
  // HOT's full compatibility gate also governs the broader recent-change list.
  const deltas=[];
  if(hot.available){
    const old=new Map(state.previousSnapshot.records.map(r=>[r.hero,r]));
    for(const hero of heroes){const previous=old.get(hero.key);if(statisticsNeedsReview(hero.statistics)||statisticsNeedsReview(previous))continue;
      for(const metric of ['winRate','pickRate','banRate'])if(rateStatus(previous,metric)==='available'&&rateStatus(hero.statistics,metric)==='available'){
        const before=previous[metric],after=hero.statistics[metric],delta=after-before;
        if(Math.abs(delta)>1e-9)deltas.push({hero,metric,before,after,delta});
      }
    }
    deltas.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.hero.key.localeCompare(b.hero.key)||a.metric.localeCompare(b.metric));
  }
  return {heroes,sorted,current,leaders:pickLeaders(current?heroes:[],metric),hot,spotlight,changes,deltas:deltas.slice(0,3)};
}
const dayKey=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
export function compatibleDashboardObservation(a,b,filters) {
  try{
    const x=validatedProvenance(a),y=validatedProvenance(b);
    if(a.stale||b.stale||!x||!y||statisticsQuery(a.filters)!==statisticsQuery(filters)||statisticsQuery(b.filters)!==statisticsQuery(filters)||x.kind!==y.kind||x.version!==y.version)return false;
    const p=verifiedPatch(a),q=verifiedPatch(b);
    if(Boolean(p)!==Boolean(q)||p&&p.id!==q.id||a.patch!==b.patch||(a.statisticsWindow??'unverified-patch-window')!==(b.statisticsWindow??'unverified-patch-window'))return false;
    if(x.kind==='derived'&&[a,b].some(s=>!s.observationStart||!Number.isFinite(Date.parse(s.observationStart))||Date.parse(s.fetchedAt??s.collectedAt)-Date.parse(s.observationStart)>OBSERVATION_TOLERANCE_MS))return false;
    return true;
  }catch{return false;}
}
// Equal hero means are descriptive observations, never a role's match win rate.
// Latest valid observation per KST day; a roster/quality gap breaks the line.
export function roleWinHistory(history,heroes,filters,{days=7,now=Date.now()}={}) {
  const end=Date.parse(history?.observedUntil)||now,start=end-days*86400000;
  const rows=(history?.snapshots??[]).filter(s=>Number.isFinite(Date.parse(s.collectedAt))&&Date.parse(s.collectedAt)>=start&&Date.parse(s.collectedAt)<=end).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt));
  const daily=new Map();
  for(const row of rows)if(compatibleDashboardObservation(row,row,filters))daily.set(dayKey(Date.parse(row.collectedAt)),row);
  const series=DASHBOARD_ROLES.map(role=>{
    const points=[];
    let previous=null;for(const [day,snapshot]of daily){const mean=meanRoleRecords(snapshot.records,heroes)[role];
      points.push({day,time:Date.parse(snapshot.collectedAt),observedAt:snapshot.collectedAt,...mean,patch:snapshot.patch,patchVerification:snapshot.patchVerification,statisticsWindow:snapshot.statisticsWindow,connectPrevious:!!previous&&compatibleDashboardObservation(previous,snapshot,filters)});previous=snapshot;
    }
    return {role,points};
  });
  return {series,days,aggregateVersion:ROLE_MEAN_VERSION,method:ROLE_MEAN_METHOD,available:series.some(s=>s.points.filter(p=>p.value!==null).length>=2),observedUntil:history?.observedUntil,warningCount:history?.warnings?.length??0};
}
