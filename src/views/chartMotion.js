// Views describe data; the host starts motion only after connection and visibility.
const hosts=new WeakMap();
const easing='cubic-bezier(.22,1,.36,1)';
export function prepareChartMotion(panel, key) {
  panel.dataset.chartKey = JSON.stringify(key);
  panel.dataset.chartEnter = 'true';
  panel.dataset.chartMotion = 'pending';
}
export function preserveChartMotion(previous, next) {
  if (previous?.dataset.chartKey === next.dataset.chartKey) next.dataset.chartEnter = 'false';
}
export function syncChartMotion(host,context='') {
  const panel=host.querySelector('#pick-history'),win=host.ownerDocument.defaultView;
  let state=hosts.get(host);
  if(!state){state={animations:[],token:0};hosts.set(host,state);}
  if(state.panel===panel)return;
  const key=panel?.dataset.chartKey?context+':'+panel.dataset.chartKey:null;
  const same=key&&state.key===key,elapsed=same&&state.phase==='running'?(state.animations[0]?.currentTime??0):0;
  const complete=same&&state.phase==='complete',previous=state.panel;
  const oldPlot=previous?.querySelector('.map-compare-chart,.history-graph');
  // A cached response may arrive before the loading-state fade has finished.
  const outgoing=key&&state.phase==='empty'&&state.exitAnimation?.playState==='running'?state.exit:null;
  const exitDuration=outgoing?Math.max(0,120-(state.exitAnimation.currentTime??0)):120;
  const exitOpacity=outgoing?exitDuration/120:1;
  const changeType=key&&state.key&&!same&&previous?.classList.contains('map-comparison')!==panel?.classList.contains('map-comparison');
  const exit=outgoing?outgoing.cloneNode(true):(changeType||!key)&&['complete','running'].includes(state.phase)&&oldPlot?oldPlot.cloneNode(true):null;
  state.token++;const token=state.token;
  state.observer?.disconnect();if(state.raf)win.cancelAnimationFrame(state.raf);
  for(const animation of state.animations)animation.cancel();state.exitAnimation?.cancel();state.exitAnimation=null;state.animations=[];state.exit?.remove();
  state.panel=panel;state.key=key;state.phase='pending';state.exit=exit;
  function fadeExit(target){
    for(const old of exit.querySelectorAll('.chart-exit-layer'))old.remove();
    exit.classList.add('chart-exit-layer');exit.setAttribute('aria-hidden','true');exit.setAttribute('inert','');
    for(const el of exit.querySelectorAll('[id],[tabindex]')){el.removeAttribute('id');el.removeAttribute('tabindex');}
    target.append(exit);state.exitAnimation=exit.animate([{opacity:exitOpacity},{opacity:0}],{duration:exitDuration,fill:'both'});
    state.exitAnimation.finished.then(()=>exit.remove()).catch(()=>{});
  }
  if(!key){state.phase='empty';if(exit&&panel&&win.requestAnimationFrame&&!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&exit.animate){const target=panel.querySelector('.map-comparison-empty,.history-empty')??panel;target.classList.add('chart-loading-transition');fadeExit(target);}return;}
  const plot=panel.querySelector('.map-compare-chart,.history-graph');
  const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finish=()=>{panel.dataset.chartMotion='complete';state.phase='complete';state.exit?.remove();state.exit=null;};
  if(complete||reduced()||!plot||!win.requestAnimationFrame||!plot.animate){finish();return;}
  panel.dataset.chartMotion='pending';
  const visible=()=>{if(!panel.isConnected||!plot.getClientRects().length)return false;const r=plot.getBoundingClientRect();return r.bottom>0&&r.top<win.innerHeight;};
  function start(){
    if(token!==state.token||!visible())return;
    if(state.phase==='complete')return;
    if(reduced()){finish();return;}
    if(state.phase==='running'){for(const a of state.animations)if(a.playState==='paused')a.play();return;}
    panel.dataset.chartMotion='running';state.phase='running';
    let delay=0;
    if(exit){delay=exitDuration;fadeExit(plot);}
    const add=(element,frames,duration,offset=0)=>{const a=element.animate(frames,{duration,delay:delay+offset,easing,fill:'both'});if(elapsed)a.currentTime=elapsed;state.animations.push(a);};
    const dataElements=selector=>[...panel.querySelectorAll(selector)].filter(el=>!el.closest('.chart-exit-layer'));
    for(const bar of dataElements('.map-bar'))add(bar,[{transform:'scaleY(0)'},{transform:'scaleY(1)'}],450,bar.closest('[data-series=selected]')?50:0);
    for(const value of dataElements('.map-value'))add(value,[{opacity:.25},{opacity:1}],220);
    for(const trace of dataElements('.history-trace'))add(trace,[{clipPath:'inset(-10% 100% -10% 0)',transform:'translateY(3px)',opacity:.35},{clipPath:'inset(-10% 0 -10% 0)',transform:'translateY(0)',opacity:1}],550);
    for(const dot of dataElements('.history-dot'))add(dot,[{opacity:0},{opacity:1}],300,250);
    Promise.allSettled(state.animations.map(a=>a.finished)).then(()=>{if(token===state.token&&panel.isConnected){finish();for(const a of state.animations)a.cancel();state.animations=[];}});
  }
  const schedule=()=>{if(state.raf)win.cancelAnimationFrame(state.raf);state.raf=win.requestAnimationFrame(()=>{state.raf=win.requestAnimationFrame(()=>{state.raf=null;start();});});};
  if(win.IntersectionObserver){state.observer=new win.IntersectionObserver(entries=>{if(token!==state.token)return;if(entries.some(e=>e.isIntersecting))schedule();else if(state.phase==='running')for(const a of state.animations)a.pause();},{threshold:.01});state.observer.observe(plot);}
  schedule();
}
