import {t,formatLocale} from '../i18n/i18n.js';
import {node,image} from './dom.js';
import {topPlayerHeroes,formatPlayerTime} from '../models/playerModel.js';
import {ROLES} from '../models/heroModel.js';
import {roleText} from './roleIcon.js';
import {formatPercentage} from './statisticsUI.js';
import {playerHeroColor} from '../data/playerHeroColors.js';
export const playerNumber=(v,digits=0)=>Number.isFinite(v)&&v>=0?v.toLocaleString(formatLocale(),{maximumFractionDigits:digits,minimumFractionDigits:digits}):t('player.noInfo');
export function playerWinLoss(row){return Number.isFinite(row?.won)&&Number.isFinite(row?.lost)?t('player.record',{won:playerNumber(row.won),lost:playerNumber(row.lost)}):null;}
function statCell(label,value,extra,className=''){const cell=node('span',undefined,'player-stat-cell '+className);cell.append(node('small',label),node('strong',value));if(extra)cell.append(node('small',extra,'player-win-loss'));return cell;}
export function renderPlayerOverview(general){
 const grid=node('div',undefined,'player-overview');grid.setAttribute('aria-label',t('player.overview'));
 grid.append(statCell(t('승률'),formatPercentage(general?.winRate),playerWinLoss(general),'player-winrate'),statCell('KDA',playerNumber(general?.kda,2)),statCell(t('player.games'),playerNumber(general?.played)),statCell(t('player.playtime'),formatPlayerTime(general?.seconds),null,'player-time-value'));return grid;
}
function detailsForHero(hero){
 const body=node('div',undefined,'player-hero-analysis');body.append(node('h4',t('player.heroAnalysis',{hero:hero.name})),node('p',t('player.scope'),'player-source'));
 const overview=renderPlayerOverview(hero);body.append(overview);
 for(const group of ['total','average']){
  const data=hero[group];if(!data||!Object.values(data).some(Number.isFinite))continue;
  const section=node('section');section.append(node('h5',t(group==='average'?'player.per10':'player.totals')));const list=node('dl',undefined,'player-analysis-grid');
  for(const key of ['eliminations','assists','deaths','damage','healing']){const pair=node('div');pair.append(node('dt',t('player.metric.'+key)),node('dd',playerNumber(data[key],group==='average'?2:0)));list.append(pair);}section.append(list);body.append(section);
 }
 if(!hero.total&&!hero.average)body.append(node('p',t('player.noDetails'),'empty-note'));
 return body;
}
export function renderPlayerHeroList(stats,heroes,openHeroes=new Set(),role='all'){
 const list=node('ul',undefined,'player-hero-stats');
 for(const hero of topPlayerHeroes(stats,heroes,role).heroes){
  const li=node('li',undefined,'player-hero-card');li.dataset.heroKey=hero.key;li.dataset.role=hero.role??'unknown';li.style.setProperty('--player-hero-color',playerHeroColor(hero.key));
  const details=node('details');details.dataset.playerHero=hero.key;details.open=openHeroes.has(hero.key);const summary=node('summary');summary.setAttribute('aria-label',t('player.heroAnalysis',{hero:hero.name}));
  const identity=node('span',undefined,'player-hero-identity');if(hero.portrait)identity.append(image(hero.portrait));const name=node('span');name.append(node('strong',hero.name),Object.hasOwn(ROLES,hero.role)?roleText(hero.role,'small'):node('small',t('player.noInfo')));identity.append(name);
  summary.append(identity,statCell(t('player.playtime'),formatPlayerTime(hero.seconds),null,'player-hero-time'),statCell(t('승률'),formatPercentage(hero.winRate),playerWinLoss(hero),'player-hero-winrate'),statCell('KDA',playerNumber(hero.kda,2),t('player.gamesValue',{count:playerNumber(hero.played)}),'player-hero-kda'));
  const arrow=node('span','⌄','player-analysis-arrow');arrow.setAttribute('aria-hidden','true');summary.append(arrow);
  if(hero.barPercent!=null){const bar=node('span',undefined,'player-time-bar');bar.setAttribute('role','meter');bar.setAttribute('aria-label',t('message.17ae345528ee',{'0':hero.name,'1':formatPlayerTime(hero.seconds)}));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(hero.barPercent));const fill=node('span');fill.style.width=`${hero.barPercent}%`;bar.append(fill);summary.append(bar);}
  details.append(summary,detailsForHero(hero));li.append(details);list.append(li);
 }return list;
}
