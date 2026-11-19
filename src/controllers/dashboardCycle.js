export const DASHBOARD_METRICS=Object.freeze(['pickRate','winRate','banRate']);
export const DASHBOARD_CYCLE_MS=5500;
export function createDashboardCycle({onMetric,onState=()=>{},document:doc=globalThis.document,window:win=globalThis.window,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let metric='pickRate',active=false,manual=false,hover=false,focus=false,timer=null,destroyed=false,transitioning=false,generation=0;
 const media=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const state=()=>({metric,manual,transitioning,paused:manual||hover||focus||!!doc?.hidden||!!media?.matches,automatic:!media?.matches});
 function changeMetric(next){metric=next;const token=++generation;transitioning=true;const done=()=>{if(destroyed||token!==generation)return;transitioning=false;onState(state());schedule();};let result;try{result=onMetric(metric);}catch{done();return;}onState(state());if(result&&typeof result.then==='function')Promise.resolve(result).then(done,done);else done();}
 function schedule(){if(timer!==null)clearTimer(timer);timer=null;if(destroyed||!active||transitioning||state().paused)return;
  timer=setTimer(()=>{timer=null;changeMetric(DASHBOARD_METRICS[(DASHBOARD_METRICS.indexOf(metric)+1)%3]);},DASHBOARD_CYCLE_MS);
 }
 function refresh(){schedule();onState(state());}
 const changed=()=>refresh();doc?.addEventListener?.('visibilitychange',changed);media?.addEventListener?.('change',changed);
 return {state,
  setActive(next){if(active===next)return;active=next;if(!next){++generation;transitioning=false;}refresh();},
  select(next){if(!DASHBOARD_METRICS.includes(next))return;manual=true;const change=metric!==next;refresh();if(change)changeMetric(next);},
  toggle(){manual=!manual;refresh();},
  setHover(next){if(hover!==next){hover=next;refresh();}},setFocus(next){if(focus!==next){focus=next;refresh();}},
  destroy(){destroyed=true;++generation;if(timer!==null)clearTimer(timer);timer=null;doc?.removeEventListener?.('visibilitychange',changed);media?.removeEventListener?.('change',changed);},
 };
}
