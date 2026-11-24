import {t,formatLocale} from '../i18n/i18n.js';import {MAP_NAMES} from '../models/mapModel.js';import {filterLabel} from '../models/statisticsModel.js';import {node,image} from './dom.js';
export function renderHeroMapRecommendations(result,batch){
 const root=node('section',undefined,'hero-map-recommendations');root.id='hero-map-recommendations';root.dataset.swipeIgnore='';root.setAttribute('aria-label',t('heroMaps.title'));
 const heading=node('div',undefined,'hero-maps-heading'),help=node('details',undefined,'hero-maps-help'),toggle=node('summary','ⓘ');toggle.setAttribute('aria-label',t('heroMaps.infoLabel'));help.append(toggle,node('p',t('heroMaps.info')));heading.append(node('h2',t('heroMaps.title')),help);root.append(heading);
 if(result.status==='loading'||result.status==='idle'){const p=node('p',t('heroMaps.loading'),'hero-maps-status');p.setAttribute('role','status');root.append(p);return root;}
 if(result.status!=='ready'){root.append(node('p',t('heroMaps.empty'),'hero-maps-status'));const retry=node('button',t('heroMaps.retry'),'dashboard-retry');retry.type='button';retry.dataset.heroMapsRetry='';root.append(retry);return root;}
 const list=node('div',undefined,'hero-map-cards');
 for(const [i,row]of result.rows.entries()){const map=batch.maps.find(m=>m.key===row.map),card=node('button',undefined,'hero-map-card');card.type='button';card.dataset.heroMap=row.map;card.setAttribute('aria-label',`${MAP_NAMES[row.map]??row.map} ${row.winRate.toFixed(2)}%`);const top=node('span',String(i+1),'hero-map-rank');card.append(top);if(map?.screenshot){const img=image(map.screenshot);img.alt='';img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});card.append(img);}card.append(node('strong',MAP_NAMES[row.map]??map?.name??row.map),node('b',row.winRate.toFixed(2)+'%'));if(row.lowPick)card.append(node('small',t('heroMaps.lowPick')));list.append(card);}
 root.append(list,node('p',filterLabel(result.filters),'hero-maps-context'));
 if(result.stale||result.refreshing)root.append(node('small',t(result.refreshing?'heroMaps.refreshing':'heroMaps.stale'),'hero-maps-retained'));
 if(result.refreshError){const retry=node('button',t('heroMaps.retry'),'dashboard-retry');retry.type='button';retry.dataset.heroMapsRetry='';root.append(retry);}
 if(result.observedAt)root.append(node('small',t('heroMaps.observed',{time:new Date(result.observedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'})})));
 return root;
}
