import {dashboardSelection,pickLeaders,roleWinHistory} from '../models/metaDashboardModel.js';
import {statisticsQuery} from '../models/statisticsModel.js';
import {createMetaDashboardView} from '../views/metaDashboardView.js';
import {createDashboardCycle} from './dashboardCycle.js';

export function createMetaDashboardController({model,snapshotService,statisticsService,counterService,mapService,roleMeanService,root=document.querySelector('#dashboard-page')}) {
 const view=createMetaDashboardView(root);
 const local={role:'all',metric:'pickRate',days:7,historyDivision:'diamond_plus',mapKey:'busan',history:{status:'idle'},map:{status:'idle'},maps:[],counter:null};
 let active=false,historyKey='',mapKey='',context='',historyToken=0,mapToken=0,stopped=false;
 const cycle=createDashboardCycle({document:root?.ownerDocument,window:root?.ownerDocument.defaultView,onMetric(metric){local.metric=metric;return draw();},onState(state){local.cycle=state;view.updateCycle?.(state);}});
 let metadataStarted=false;
 function draw(){if(!active||stopped)return;local.cycle=cycle.state();const data=dashboardSelection(model,local.role,local.metric);
   const target=data.current?(data.spotlight??data.sorted[0]):null;local.counter=target?{target,result:counterService.getHeroCounters(target.key,model.state.heroes)}:null;
   data.history=local.history.means??roleWinHistory(local.history.result,model.state.heroes,{...model.state.statsFilters,division:model.state.statsFilters.gamemode==='quickplay'?'all':local.historyDivision},{days:local.days});
   const byKey=new Map(local.map.result?.records?.map(r=>[r.hero,r])??[]);
   data.mapLeaders=pickLeaders(local.map.status==='ready'&&!local.map.result?.stale?model.state.heroes.map(h=>({...h,statistics:byKey.get(h.key)})):[]);
   return view.render(model,local,data);
 }
 function load(){
   if(!active||stopped)return;
   if(mapService&&!metadataStarted){metadataStarted=true;mapService.getMaps().then(maps=>{if(!stopped){local.maps=maps;draw();}}).catch(()=>{});}
   const filters={...model.state.statsFilters},query=statisticsQuery(filters);
   if(context!==query){context=query;if(filters.map!=='all')local.mapKey=filters.map;}
   if(model.state.status==='ready'){
    const historyFilters={...filters,division:filters.gamemode==='quickplay'?'all':local.historyDivision};local.historyFilters=historyFilters;
    const key=statisticsQuery(historyFilters)+':'+local.days+':'+model.state.heroes.map(h=>h.key+':'+h.role).sort().join(',');
    if(historyKey!==key){historyKey=key;const token=++historyToken;local.history={status:'loading'};
     const days=local.days,heroes=model.state.heroes;
     Promise.resolve().then(async()=>{
      if(roleMeanService){try{return {means:await roleMeanService.getHistory(historyFilters,{days,heroes})};}catch{}}
      return {result:await snapshotService.getHistory(historyFilters,{days,scope:'range'})};
     }).then(result=>{if(token===historyToken&&!stopped)local.history={status:'ready',...result};}).catch(error=>{if(token===historyToken&&!stopped)local.history={status:'error',error:error.message};}).finally(()=>{if(token===historyToken)draw();});
    }
    const mapFilters={...filters,map:local.mapKey},nextKey=statisticsQuery(mapFilters);
    if(mapKey!==nextKey){mapKey=nextKey;const token=++mapToken;local.map={status:'loading'};
     Promise.resolve().then(()=>statisticsService.getStatistics(mapFilters)).then(result=>{if(statisticsQuery(result.filters)!==nextKey)throw Error('Mismatched map statistics');if(token===mapToken&&!stopped)local.map={status:'ready',result};}).catch(error=>{if(token===mapToken&&!stopped)local.map={status:'error',error:error.message};}).finally(()=>{if(token===mapToken)draw();});
    }
   }
   draw();
 }
 const click=event=>{
  const role=event.target.closest('[data-dashboard-role]')?.dataset.dashboardRole;
  if(['all','tank','damage','support'].includes(role)){local.role=role;draw();}
  if(event.target.closest('[data-dashboard-cycle]'))cycle.toggle();
  const retry=event.target.closest('[data-dashboard-retry]')?.dataset.dashboardRetry;
  if(retry==='history'){historyKey='';load();}if(retry==='map'){mapKey='';load();}
  if(retry==='current')document.querySelector(model.state.status==='error'?'[data-action="retry"]':'[data-action="stats-refresh"]')?.click();
  const map=event.target.closest('[data-dashboard-map-link]')?.dataset.dashboardMapLink;
  if(map){const select=document.querySelector('#stats-map');if(select&&select.value!==map){select.value=map;select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));}}
 };
 const change=event=>{if(event.target.id==='dashboard-days'){local.days=Number(event.target.value);load();}if(event.target.id==='dashboard-history-division'){local.historyDivision=event.target.value;load();}if(event.target.id==='dashboard-map'){local.mapKey=event.target.value;load();}};
 const cycleArea=e=>e?.closest?.('.dashboard-highlights,.dashboard-kpi-controls');
 const over=e=>{if(e.pointerType!=='touch')cycle.setHover(true);};
 const out=e=>{if(!cycleArea(e.relatedTarget))cycle.setHover(false);};
 const focusIn=e=>{if(cycleArea(e.target))cycle.setFocus(true);};
 const focusOut=e=>{if(cycleArea(e.target)&&!cycleArea(e.relatedTarget))cycle.setFocus(false);};
 root?.addEventListener('click',click);root?.addEventListener('change',change);
 const cycleAreas=[...root?.querySelectorAll('.dashboard-highlights,.dashboard-kpi-controls')??[]];for(const area of cycleAreas){area.addEventListener('pointerenter',over);area.addEventListener('pointerleave',out);}for(const [name,fn]of [['focusin',focusIn],['focusout',focusOut]])root?.addEventListener(name,fn);
 return {setActive(next){view.setActive(next);if(active&&!next){view.cancelMotion();cycle.setHover(false);cycle.setFocus(false);}active=next;cycle.setActive(next&&model.state.status==='ready'&&model.state.statsStatus==='ready');if(active)load();},refresh:load,
  stop(){stopped=true;active=false;cycle.destroy();++historyToken;++mapToken;root?.removeEventListener('click',click);root?.removeEventListener('change',change);for(const area of cycleAreas){area.removeEventListener('pointerenter',over);area.removeEventListener('pointerleave',out);}for(const [name,fn]of [['focusin',focusIn],['focusout',focusOut]])root?.removeEventListener(name,fn);view.destroy();},
 };
}
