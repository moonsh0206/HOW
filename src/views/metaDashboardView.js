import {rankChangeMarker} from './rankChangeView.js';
import {dashboardPlayerSearch} from './dashboardPlayerSearch.js';
import {createDashboardTitleMotion} from './dashboardTitleMotion.js';
import {createDashboardMapMotion} from './dashboardMapMotion.js';
import {dashboardDecoration} from './dashboardDecorations.js';
import {node,image} from './dom.js';
import {t,label,getLanguage,formatLocale,errorText} from '../i18n/i18n.js';
import {roleName,roleIcon,roleBadge} from './roleIcon.js';
import {metricValue,formatPercentage,formatPercentagePoints} from './statisticsUI.js';
import {tierButton} from './tierReasonView.js';
import {metaTierEmblem} from './metaTierEmblem.js';
import {createFilterCombobox} from './filterCombobox.js';
import {RANK_OPTIONS,mapDropdownOptions} from './filterOptions.js';
import maps from '../data/standardMaps.json' with {type:'json'};
import {filterLabel} from '../models/statisticsModel.js';
import {MAP_NAMES} from '../models/mapModel.js';
import {dashboardHistoryChart,animateDashboardHistory} from './dashboardHistoryView.js';
export const dashboardTime=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
function heroLink(hero){const a=node('a',undefined,'dashboard-hero');a.href=`#/heroes/${hero.key}`;if(hero.portrait)a.append(image(hero.portrait));a.append(node('strong',hero.name));return a;}
function link(text,href){const a=node('a',text,'dashboard-link');a.href=href;return a;}
function panel(root,id,title){const article=node('section',undefined,'dashboard-panel');article.id=id;const h=node('h2',t(title));h.dataset.dashboardTitle=title;article.append(h);root.append(article);return article;}
function panelHeader(panel,control){const header=node('div',undefined,'dashboard-panel-head');header.append(panel.querySelector('h2'),control);panel.prepend(header);return header;}
const metricLabel=metric=>({winRate:t('승률'),pickRate:t('픽률'),banRate:t('밴률')})[metric];
function hologramLayer(role){
 const film=node('span',undefined,'dashboard-hologram');film.setAttribute('aria-hidden','true');film.dataset.holoRole=role;film.append(node('span',undefined,'dashboard-hologram-diffuse'),node('span',undefined,'dashboard-hologram-flow'));
 const clock=globalThis.performance?.now?.()??0,timing={tank:[18000,24000,14000,1100],damage:[20000,27000,17000,5700],support:[17000,23000,13000,10300],spotlight:[19000,26000,16000,14900],heading:[16000,28000,18000,19300]}[role];
 for(const [i,layer]of ['a','b','c'].entries()){film.style.setProperty(`--holo-${layer}-duration`,`${timing[i]}ms`);film.style.setProperty(`--holo-${layer}-delay`,`${-((clock+timing[3]+i*3100)%timing[i])}ms`);}return film;
}
function featureCard(item,model,local,data){
 const metric=local.metric??'pickRate',spotlight=!item.role,isHot=spotlight&&data.hot.heroes.length>0;
 const card=node('article',undefined,'dashboard-feature'+(spotlight?' dashboard-spotlight':''));card.dataset.featureRole=item.role??'spotlight';if(item.role)card.dataset.metric=metric;
 const heading=node('h2');if(item.role){const icon=roleIcon(item.role);icon.classList.add('dashboard-leader-role');heading.append(icon);}else heading.append(dashboardDecoration('flame','dashboard-spotlight-icon'));heading.append(node('span',item.role?t('dashboard.metricLeader',{role:roleName(item.role),metric:metricLabel(metric)}):t(isHot?'dashboard.hot':'dashboard.spotlight')));card.append(heading);
 if(item.hero){card.dataset.heroKey=item.hero.key;const value=node('strong',item.role?formatPercentage(item.hero.statistics[metric]):undefined,'dashboard-feature-value');if(spotlight){if(Number.isFinite(item.hero.metaScore))value.append(node('span','META ','dashboard-meta-label'),node('span',item.hero.metaScore.toFixed(1),'dashboard-meta-flame'));else value.textContent=t('미제공');}const identity=heroLink(item.hero);if(spotlight&&item.hero.tier){const tier=metaTierEmblem(item.hero.tier);tier.classList.add('dashboard-spotlight-tier');identity.append(tier);}card.append(identity,value);
  if(item.role){const aux=node('small',undefined,'dashboard-feature-aux');for(const k of ['winRate','pickRate','banRate'].filter(k=>k!==metric))aux.append(node('span',`${metricLabel(k)} ${metricValue(item.hero,k)}`));card.append(aux);}
  else if(isHot)card.append(node('small',`${t('픽률')} ${formatPercentagePoints(item.hero.pickDelta)} · ${t('승률')} ${formatPercentagePoints(item.hero.winDelta)}`),node('small',t('dashboard.compared',{previous:dashboardTime(data.hot.previousAt),current:dashboardTime(data.hot.currentAt)}),'dashboard-feature-note'));

 }else card.append(node('p',t(['loading','idle'].includes(model.state.statsStatus)?'dashboard.loading':'dashboard.unavailable'),'dashboard-empty'));
 if(item.role){const content=node('div',undefined,'dashboard-feature-content');content.append(...card.childNodes);card.append(content);for(const img of content.querySelectorAll('img'))img.loading='eager';}
 const note=card.querySelector('.dashboard-feature-note');if(note)note.title=note.textContent;
 const film=hologramLayer(item.role??'spotlight');
 const medallion=node('span',undefined,'dashboard-card-medallion');medallion.setAttribute('aria-hidden','true');card.append(film,medallion);return card;
}
export function createMetaDashboardView(root){
 if(!root)return {render(){},destroy(){}};
 const heading=node('header',undefined,'dashboard-heading'),eyebrow=node('p','META / OVERVIEW','eyebrow'),title=node('h1'),intro=node('p'),headingCopy=node('div',undefined,'dashboard-heading-copy');headingCopy.append(eyebrow,title);heading.append(hologramLayer('heading'),headingCopy,intro);const playerSearch=dashboardPlayerSearch();heading.append(playerSearch.form);
 const titleMotion=createDashboardTitleMotion(root,[eyebrow,title]);
 const metricControls=node('div',undefined,'dashboard-kpi-controls');const play=node('button');play.type='button';play.dataset.dashboardCycle='toggle';metricControls.append(play);heading.append(metricControls);
 const filterHost=node('div',undefined,'dashboard-filter-host');filterHost.id='dashboard-filter-host';
 const scope=node('p',undefined,'dashboard-scope'),source=node('p',undefined,'dashboard-source');source.setAttribute('role','status');
 const stateNote=node('div',undefined,'dashboard-state');stateNote.setAttribute('role','status');
 const highlights=node('div',undefined,'dashboard-highlights'),middle=node('div',undefined,'dashboard-middle'),bottom=node('div',undefined,'dashboard-bottom');
 const Observer=root.ownerDocument.defaultView?.IntersectionObserver;
 const hologramObserver=Observer?new Observer(entries=>{for(const entry of entries)root.classList.toggle(entry.target===heading?'dashboard-heading-offscreen':'dashboard-hologram-offscreen',!entry.isIntersecting);},{rootMargin:'80px'}):null;hologramObserver?.observe(heading);hologramObserver?.observe(highlights);
 const cycleDots=node('div',undefined,'dashboard-cycle-dots');cycleDots.setAttribute('role','img');for(const metric of ['pickRate','winRate','banRate']){const dot=node('span');dot.dataset.cycleDot=metric;dot.setAttribute('aria-hidden','true');cycleDots.append(dot);}
 const context=node('div',undefined,'dashboard-context');context.append(scope,source,stateNote);
 const atmosphere=node('div',undefined,'dashboard-atmosphere');atmosphere.setAttribute('aria-hidden','true');
 for(let i=0;i<6;i++)atmosphere.append(node('span',undefined,'dashboard-ash'));
 root.replaceChildren(atmosphere,heading,filterHost,context,highlights,middle,bottom);
 const ranking=panel(middle,'dashboard-ranking','dashboard.ranking'),roleMenu=node('div',undefined,'role-filters dashboard-role-filters');roleMenu.setAttribute('role','group');
 for(const role of ['all','tank','damage','support']){const b=node('button');b.type='button';b.dataset.dashboardRole=role;roleMenu.append(b);}
 const rankContent=node('div');ranking.append(roleMenu,rankContent);
 let ranksExpanded=false;const rankMore=node('button',undefined,'dashboard-rank-more');rankMore.type='button';rankMore.setAttribute('aria-controls','dashboard-rank-rows');function syncRanks(){ranking.classList.toggle('is-expanded',ranksExpanded);rankMore.setAttribute('aria-expanded',String(ranksExpanded));rankMore.textContent=t(ranksExpanded?'dashboard.lessRanks':'dashboard.moreRanks');}rankMore.addEventListener('click',()=>{ranksExpanded=!ranksExpanded;syncRanks();});
 panelHeader(ranking,roleMenu);
 const historyPanel=panel(middle,'dashboard-history','dashboard.history'),period=node('label'),days=node('select');days.id='dashboard-days';const periodLabel=node('span',t('dashboard.period')); period.append(periodLabel,days);for(const d of [7,30]){const o=node('option');o.value=d;days.append(o);}historyPanel.append(period);const daysCombo=createFilterCombobox(days,{options:[]});const historyBody=node('div');historyPanel.append(historyBody);
 const historyControls=node('div',undefined,'dashboard-history-controls'),rankLabel=node('label'),rankCaption=node('span'),rankSelect=node('select');rankSelect.id='dashboard-history-division';rankLabel.append(rankCaption,rankSelect);historyControls.append(rankLabel,period);const rankCombo=createFilterCombobox(rankSelect,{options:[]});panelHeader(historyPanel,historyControls);historyBody.className='dashboard-history-body';
 const counters=panel(bottom,'dashboard-counters','dashboard.counters'),counterBody=node('div'),counterTarget=node('div',undefined,'dashboard-counter-target');counters.append(counterBody);panelHeader(counters,counterTarget);
 const mapPanel=panel(bottom,'dashboard-maps','dashboard.mapTitle'),mapLabel=node('label'),mapSelect=node('select');mapSelect.id='dashboard-map';const mapCaption=node('span',t('전장')); mapLabel.append(mapCaption,mapSelect);mapPanel.append(mapLabel);const mapCombo=createFilterCombobox(mapSelect,{options:[]});const mapBody=node('div',undefined,'dashboard-map-body');mapPanel.append(mapBody);
 const changes=panel(bottom,'dashboard-changes','dashboard.changes'),changesBody=node('div');changes.append(changesBody);
 panelHeader(mapPanel,mapLabel);
 const mapArt=node('div',undefined,'dashboard-map-art');mapArt.setAttribute('aria-hidden','true');mapPanel.prepend(mapArt);
 const mapMotion=createDashboardMapMotion({panel:mapPanel,art:mapArt,body:mapBody});
 let signature='',selectedMetric='',featureSignature='',chartKey='',cancelChart=()=>{},frame=null,featureToken=0,featureAnimations=[],spotlightEntered=false,spotlightKey='';
 const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function clearFeatures(){++featureToken;for(const a of featureAnimations)a.cancel();featureAnimations=[];for(const ghost of highlights.querySelectorAll('.dashboard-card-exit'))ghost.remove();}
 const motionMedia=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),motionChanged=()=>{if(!motionMedia.matches)return;for(const a of featureAnimations)a.cancel();featureAnimations=[];for(const ghost of highlights.querySelectorAll('.dashboard-card-exit'))ghost.remove();};motionMedia?.addEventListener?.('change',motionChanged);
 function updateCycle(state={metric:'pickRate',manual:false,automatic:true}){metricControls.setAttribute('aria-label',t('dashboard.metrics'));metricControls.dataset.metric=state.metric;cycleDots.setAttribute('aria-label',t('dashboard.currentMetric',{metric:metricLabel(state.metric)}));for(const dot of cycleDots.children)dot.classList.toggle('is-active',dot.dataset.cycleDot===state.metric);root.classList.toggle('dashboard-motion-paused',!!state.paused||!state.automatic);root.classList.toggle('dashboard-motion-suspended',!!root.ownerDocument.hidden||!state.automatic);const glyph=state.manual?'▶':'Ⅱ';if(play.textContent!==glyph)play.textContent=glyph;play.disabled=!state.automatic;play.setAttribute('aria-label',t(state.manual?'dashboard.cycleResume':'dashboard.cyclePause'));play.title=play.getAttribute('aria-label');}
 function features(model,local,data,metricOnly){const key=JSON.stringify([local.metric,model.state.statsStatus,model.state.statsFilters,data.leaders,data.spotlight,data.hot.heroes[0]]);if(featureSignature===key)return;featureSignature=key;clearFeatures();const token=featureToken;
  const prepared=[...data.leaders,{role:null,hero:data.spotlight}].map(item=>featureCard(item,model,local,data));
  const replace=()=>{if(token!==featureToken)return;[...data.leaders,{role:null,hero:data.spotlight}].forEach((item,i)=>{if(metricOnly&&i===3)return;const card=prepared[i],slot=highlights.children[i],old=i<3?slot?.querySelector(':scope>.dashboard-feature:not(.dashboard-card-exit)'):slot;if(i===3){const nextKey=JSON.stringify([getLanguage(),item.hero,data.hot]);if(old&&nextKey===spotlightKey)return;spotlightKey=nextKey;}
    if(i<3){const host=slot??node('div',undefined,'dashboard-card-slot');if(!slot)highlights.append(host);if(metricOnly&&old&&!reduced()&&card.animate){old.classList.add('dashboard-card-exit');old.removeAttribute('data-feature-role');old.setAttribute('aria-hidden','true');old.inert=true;host.append(card);const options={duration:520,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'backwards'},exit=old.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-28px)'}],{...options,fill:'forwards'});featureAnimations.push(exit,card.animate([{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'translateY(0)'}],options));exit.finished.then(()=>old.remove(),()=>old.remove());}else host.replaceChildren(card);return;}
    if(old)old.replaceWith(card);else highlights.append(card);
    const entering=i===3&&item.hero&&(!spotlightEntered||old?.dataset.heroKey!==item.hero.key||old?.querySelector('.dashboard-feature-value')?.textContent!==card.querySelector('.dashboard-feature-value')?.textContent);if(i===3&&item.hero)spotlightEntered=true;
    if(!reduced()&&card.animate&&entering)featureAnimations.push(card.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'}));
   });highlights.append(cycleDots);return Promise.allSettled(featureAnimations.map(a=>a.finished));};
  const images=metricOnly&&!reduced()?prepared.slice(0,3).flatMap(c=>[...c.querySelectorAll('img')]):[];if(images.some(img=>!img.complete)&&images.every(img=>typeof img.decode==='function'))return Promise.allSettled(images.map(img=>img.decode())).then(replace);return replace();
 }
 const loading=()=>node('p',t('dashboard.loading'),'dashboard-empty');
 const unavailable=()=>node('p',t('dashboard.unavailable'),'dashboard-empty');
 function error(state,kind){const box=node('div');box.append(node('p',t('dashboard.error'),'dashboard-empty'));if(state.error)box.append(node('small',errorText(state.error)));const button=node('button',t('dashboard.retry'),'dashboard-retry');button.type='button';button.dataset.dashboardRetry=kind;box.append(button);return box;}
 return {
  setActive(next){titleMotion.setActive(next);playerSearch.setActive(next);},
  updateCycle,
  render(model,local,data){
   const currentSignature=JSON.stringify([getLanguage(),local.role,local.days,local.historyDivision,local.mapKey,model.state.status,model.state.statsStatus,model.state.statsFilters,data.sorted.map(h=>[h.key,h.name,h.tier,h.metaScore,h.statistics]),data.hot,data.changes&&[...data.changes],local.history,local.map,local.maps,local.counter]);
   updateCycle(local.cycle);const metric=local.metric??'pickRate';if(signature===currentSignature&&selectedMetric===metric)return;
   const metricOnly=signature===currentSignature;signature=currentSignature;selectedMetric=metric;if(metricOnly)return features(model,local,data,true);
   const focus=root.contains(document.activeElement)?document.activeElement:null,href=focus?.closest('a')?.getAttribute('href');
   playerSearch.translate();title.textContent=t('dashboard.title');intro.textContent=t('dashboard.intro');root.querySelectorAll('[data-dashboard-title]').forEach(e=>e.textContent=t(e.dataset.dashboardTitle));
   scope.textContent=filterLabel(model.state.statsFilters);source.textContent=model.state.statistics?t('dashboard.source',{time:dashboardTime(model.state.statistics.fetchedAt)}):t('dashboard.loading');
   stateNote.replaceChildren();if(model.state.status==='error'||model.state.statsStatus==='error')stateNote.append(error({error:model.state.statsError||model.state.error},'current'));else if(model.state.statsStatus==='stale')stateNote.append(node('p',t('dashboard.stale')));else if(model.state.status==='loading'||model.state.statsStatus==='loading')stateNote.append(loading());
   features(model,local,data,false);
   roleMenu.setAttribute('aria-label',t('dashboard.roles'));for(const b of roleMenu.children){b.replaceChildren();if(b.dataset.dashboardRole!=='all')b.append(roleIcon(b.dataset.dashboardRole));b.append(node('span',b.dataset.dashboardRole==='all'?t('전체'):roleName(b.dataset.dashboardRole)));b.setAttribute('aria-pressed',String(local.role===b.dataset.dashboardRole));}
   rankContent.replaceChildren();
   if(!data.current)rankContent.append(['loading','idle'].includes(model.state.statsStatus)?loading():unavailable());else{
    const table=node('table',undefined,'dashboard-ranking-table');table.append(node('caption',t('dashboard.tableLabel'),'sr-only'));const head=node('thead'),tr=node('tr');for(const labelKey of [t('순위'),t('영웅'),t('역할'),t('티어'),t('승률'),t('픽률'),t('밴률')]){const cell=node('th',tr.children.length===0?'#':labelKey);cell.scope='col';cell.title=labelKey;tr.append(cell);}head.append(tr);table.append(head);const body=node('tbody');body.id='dashboard-rank-rows';
    data.sorted.slice(0,6).forEach((hero,index)=>{const row=node('tr');row.dataset.dashboardHero=hero.key;const ordinal=node('td',hero.tier&&hero.metaScore!=null?String(index+1):'—'),change=data.changes.get(hero.key);if(change)ordinal.append(rankChangeMarker(change));const identity=node('td');identity.append(heroLink(hero));const role=node('td');role.append(roleBadge(hero.role,{showLabel:true}));const tier=node('td');tier.append(tierButton(hero));row.append(ordinal,identity,role,tier);for(const [key,labelKey]of [['winRate',t('승률')],['pickRate',t('픽률')],['banRate',t('밴률')]]){const td=node('td',metricValue(hero,key));td.dataset.label=labelKey;row.append(td);}body.append(row);});table.append(body);rankContent.append(table);syncRanks();rankContent.append(rankMore);
   }rankContent.append(link(t('dashboard.allHeroes'),'#/tiers'),link(t('dashboard.metaLink'),'#/meta'));
   rankCaption.textContent=t('dashboard.graphRank');rankSelect.setAttribute('aria-label',t('dashboard.graphRank'));const rankOptions=model.state.statsFilters.gamemode==='quickplay'?[RANK_OPTIONS.find(o=>o.value==='all')]:RANK_OPTIONS;rankSelect.replaceChildren(...rankOptions.map(o=>{const option=node('option',o.label);option.value=o.value;return option;}));rankSelect.value=model.state.statsFilters.gamemode==='quickplay'?'all':local.historyDivision??'diamond_plus';rankCombo.setOptions(rankOptions);rankCombo.sync();periodLabel.textContent=t('dashboard.period');days.setAttribute('aria-label',t('dashboard.period'));daysCombo.setOptions([7,30].map(d=>({value:String(d),label:t('dashboard.days',{days:d})})));for(const o of days.options)o.textContent=t('dashboard.days',{days:o.value});days.value=String(local.days);daysCombo.sync();
   const nextChartKey=JSON.stringify([getLanguage(),local.days,local.historyFilters,local.history]);if(nextChartKey!==chartKey){chartKey=nextChartKey;cancelChart();if(frame!==null)cancelAnimationFrame(frame);frame=null;historyBody.replaceChildren();
    if(local.history.status==='loading')historyBody.append(loading());else if(local.history.status==='error')historyBody.append(error(local.history,'history'));else{const chart=dashboardHistoryChart(data.history);historyBody.append(chart);if(globalThis.requestAnimationFrame)frame=requestAnimationFrame(()=>{frame=null;cancelChart=animateDashboardHistory(chart);});}
    if(data.history?.warningCount)historyBody.append(node('small',t('dashboard.historyWarnings')));

   }
   counterBody.replaceChildren(node('p',t('dashboard.counterNote'),'dashboard-caption'));
   counterTarget.replaceChildren();if(local.counter){counterTarget.append(heroLink(local.counter.target));const relations=local.counter.result.counteredBy.filter(r=>r.status==='reviewed').slice(0,2);for(const relation of relations){const group=node('div',undefined,'dashboard-counter');group.append(heroLink({key:relation.heroKey,name:relation.name,portrait:relation.portrait}),node('p',label(relation.reason)));counterBody.append(group);}if(!relations.length)counterBody.append(node('p',t('dashboard.counterEmpty')));counterBody.append(link(t('dashboard.counterLink'),`#/heroes/${local.counter.target.key}/overview`));}else counterBody.append(unavailable());
   mapCaption.textContent=t('전장');mapSelect.setAttribute('aria-label',t('전장'));const mapOptions=mapDropdownOptions(maps,local.mapKey).filter(o=>o.value!=='all');mapSelect.replaceChildren(...mapOptions.map(o=>{const option=node('option',o.label);option.value=o.value;return option;}));mapSelect.value=local.mapKey;mapCombo.setOptions(mapOptions);
   const nextMapBody=node('div');
   if(local.map.status==='loading')nextMapBody.append(loading());else if(local.map.status==='error')nextMapBody.append(error(local.map,'map'));else if(local.map.result?.stale)nextMapBody.append(node('p',t('dashboard.stale')));else{for(const {role,hero}of data.mapLeaders??[]){const row=node('div',undefined,'dashboard-map-row');row.append(node('small',roleName(role)));if(hero)row.append(heroLink(hero),node('strong',formatPercentage(hero.statistics.pickRate)));else row.append(unavailable());nextMapBody.append(row);}if(local.map.result){const observed=node('small',`${MAP_NAMES[local.mapKey]} · ${dashboardTime(local.map.result.fetchedAt)} KST`);observed.dataset.mapObserved='true';nextMapBody.append(observed);}}
   const mapLink=link(t('dashboard.mapLink'),'#/tiers');mapLink.dataset.dashboardMapLink=local.mapKey;nextMapBody.append(mapLink);

   const credit=node('a',t('dashboard.mapCredit'));credit.href='https://github.com/TeKrop/overfast-api#credits';credit.target='_blank';credit.rel='noreferrer';credit.className='dashboard-map-credit';nextMapBody.append(credit);
   const imageUrl=local.maps?.find(m=>m.key===local.mapKey)?.screenshot??'';
   const mapIdentity=JSON.stringify([model.state.statsFilters,local.mapKey]);
   mapMotion.render({key:mapIdentity,mapKey:local.mapKey,mapName:MAP_NAMES[local.mapKey]??local.mapKey,imageUrl,status:local.map.status,content:nextMapBody,signature:JSON.stringify([getLanguage(),mapIdentity,local.map,imageUrl,data.mapLeaders]),previousLabel:map=>t('dashboard.previousMap',{map:MAP_NAMES[map]??map})});
   changesBody.replaceChildren();if(!data.deltas.length)changesBody.append(node('p',t('dashboard.changesEmpty'),'dashboard-empty'));for(const delta of data.deltas){const row=node('article',undefined,'dashboard-change');row.append(heroLink(delta.hero));const field={winRate:t('승률'),pickRate:t('픽률'),banRate:t('밴률')}[delta.metric];row.append(node('p',`${field} · ${formatPercentage(delta.before)} → ${formatPercentage(delta.after)}`),node('strong',formatPercentagePoints(delta.delta),delta.delta>0?'rank-up':'rank-down'));changesBody.append(row);}if(data.hot.available)changesBody.append(node('small',t('dashboard.compared',{previous:dashboardTime(data.hot.previousAt),current:dashboardTime(data.hot.currentAt)})));
   if(href&&focus&&!focus.isConnected)[...root.querySelectorAll('a')].find(a=>a.getAttribute('href')===href)?.focus({preventScroll:true});

  },
  cancelMotion(){mapMotion.cancel();clearFeatures();spotlightEntered=false;spotlightKey='';featureSignature='';cancelChart();if(frame!==null)globalThis.cancelAnimationFrame?.(frame);frame=null;chartKey='';signature='';},
  destroy(){playerSearch.destroy();titleMotion.destroy();mapMotion.destroy();hologramObserver?.disconnect();clearFeatures();motionMedia?.removeEventListener?.('change',motionChanged);cancelChart();if(frame!==null)globalThis.cancelAnimationFrame?.(frame);rankCombo.destroy();daysCombo.destroy();mapCombo.destroy();},
 };
}

