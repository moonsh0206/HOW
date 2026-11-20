import {errorText} from '../i18n/i18n.js';
import {formatLocale} from '../i18n/i18n.js';
import {t} from '../i18n/i18n.js';
import {node,image} from './dom.js';
import {ROLES} from '../models/heroModel.js';
import {renderPlayerRank} from './playerRankView.js';
import {renderPlayerCardRanks} from './playerCardRanksView.js';
import {renderPlayerOverview,renderPlayerHeroList} from './playerDashboardView.js';
import {revealResults} from './contentMotion.js';
import {createFilterCombobox} from './filterCombobox.js';
import {roleIcon} from './roleIcon.js';
import {PLAYER_ROLE_KEYS} from '../models/playerModel.js';
const value=v=>v==null?t("player.noInfo"):String(v);
export const PLAYER_EMPTY_IMAGE=`${import.meta.env?.BASE_URL??'/'}assets/illustrations/HOW_kinetic_grasp_clean.png`;
export function renderPlayerSearch(root){
 if(!root||root.childElementCount)return;
 const back=node('a',t("player.back"),'player-back');back.href='#/player-search';back.hidden=true;root.append(back);
 root.append(node('p','PLAYER PROFILE','eyebrow'),node('h1',t("player.title")));
 const form=node('form');form.id='player-search-form';const label=node('label',t("player.label"));label.htmlFor='player-query';
 const input=node('input');input.id='player-query';input.type='search';input.placeholder=t("player.placeholder");input.maxLength=80;input.autocomplete='off';
 const button=node('button',t("player.search"),'primary-button');button.type='submit';form.append(label,input,button);root.append(form);
 root.append(node('p',t("player.guide"),'player-guide'));

 const hero=node('div',undefined,'player-search-hero');for(const child of [...root.children])if(!child.classList.contains('player-back'))hero.append(child);root.append(hero);
 const status=node('p');status.id='player-search-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const results=node('ul');results.id='player-results';results.setAttribute('aria-label',t("플레이어 검색 결과"));
 const more=node('button',t("player.more"),'player-more');more.type='button';more.dataset.playerMore='';more.hidden=true;
 const favoritesTitle=node('h2',t("즐겨찾기한 플레이어"),'player-favorites-title');favoritesTitle.hidden=true;
 const favoritesNotice=node('p',undefined,'player-favorites-notice');favoritesNotice.setAttribute('role','status');
 const empty=node('section',undefined,'player-search-empty');empty.hidden=true;empty.setAttribute('aria-label',t("검색 결과 없음"));const illustration=image(PLAYER_EMPTY_IMAGE);illustration.alt=t("기계식 손과 푸른 중력 소용돌이");illustration.width=1672;illustration.height=941;
 const again=node('button',t("player.again"),'primary-button');again.type='button';again.dataset.playerSearchAgain='';empty.append(illustration,node('h2',t("player.emptyTitle")),node('p',t("player.emptyHint")),node('p',t("player.emptyPrivacy")),again);
 const profile=node('section');profile.id='player-profile';profile.setAttribute('aria-label',t("선택한 플레이어 프로필"));root.append(status,favoritesNotice,favoritesTitle,results,more,empty,profile);
}
export function createPlayerSearchView(root){
 renderPlayerSearch(root);
 let observer,roleCombo,roleHost,roleSelect;
 function roleFilter(selected='all'){
  const options=PLAYER_ROLE_KEYS.map(value=>({value,label:value==='all'?t('player.roleAll'):ROLES[value]}));
  if(!roleHost){roleHost=node('label',undefined,'player-role-filter');roleHost.append(node('span',t('player.roleLabel'),'sr-only'));roleSelect=node('select');roleSelect.id='player-hero-role';roleHost.htmlFor=roleSelect.id;roleHost.append(roleSelect);}
  roleHost.querySelector('.sr-only').textContent=t('player.roleLabel');
  roleSelect.replaceChildren(...options.map(choice=>{const option=node('option',choice.label);option.value=choice.value;return option;}));roleSelect.value=PLAYER_ROLE_KEYS.includes(selected)?selected:'all';
  if(!roleCombo)roleCombo=createFilterCombobox(roleSelect,{options,icon:value=>value==='all'?node('span',undefined,'player-role-placeholder'):roleIcon(value)});else roleCombo.setOptions(options);
  return roleHost;
 }
 return {destroy(){observer?.disconnect();roleCombo?.destroy();},observeRanks(callback){observer?.disconnect();observer=null;if(!callback||!root.ownerDocument.defaultView.IntersectionObserver)return;
  observer=new root.ownerDocument.defaultView.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);callback(entry.target.dataset.playerId);}},{rootMargin:'80px'});
  for(const card of root.querySelectorAll('#player-results [data-player-id]'))observer.observe(card);
 },updateRanks(id,entry,isPublic){const card=[...root.querySelectorAll('#player-results [data-player-id]')].find(c=>c.dataset.playerId===id);card?.querySelector('.player-card-ranks')?.replaceWith(renderPlayerCardRanks(entry,isPublic));},render(state,heroes=[]){
  const dedicated=state.mode==='profile';root.classList.toggle('player-profile-page',dedicated);
  root.querySelector('#player-search-form').hidden=dedicated;
  for(const child of root.children)if(child.id!=='player-profile'&&!child.classList.contains('player-back'))child.hidden=dedicated;
  root.querySelector('.player-back').hidden=!dedicated;
  const players=state.displayPlayers??state.results;
  const isEmpty=state.searchStatus==='ready'&&state.total===0&&state.results.length===0;
  root.querySelector('.player-search-empty').hidden=dedicated||!isEmpty;
  root.querySelector('.player-favorites-title').hidden=dedicated||!state.showFavorites||!players.length;
  root.querySelector('.player-favorites-title').textContent=t("message.aa9d5894f87d",{"0":(state.favorites?.size??0)});
  const notice=root.querySelector('.player-favorites-notice');notice.textContent=state.favoritesNotice??'';notice.hidden=dedicated||!notice.textContent;
  const status=root.querySelector('#player-search-status');status.textContent=state.searchStatus==='loading'?t("player.searching"):state.searchStatus==='error'?errorText(state.searchError):state.searchStatus==='ready'?state.results.length?t("message.73ddd6859709",{"0":(state.total),"1":(state.results.length)}):t("player.noResults"):state.showFavorites&&players.length?t("player.selectSaved"):t("player.prompt");
  status.dataset.state=state.searchStatus;root.querySelector('#player-search-form').setAttribute('aria-busy',String(state.searchStatus==='loading'));
  const results=root.querySelector('#player-results'),focus=root.ownerDocument.activeElement?.dataset.playerId,favoriteFocus=root.ownerDocument.activeElement?.dataset.playerFavorite;results.replaceChildren();
  for(const player of players){const li=node('li');li.className='player-result-card';const button=node('a');button.href=`#/players/${encodeURIComponent(player.id)}`;button.dataset.playerId=player.id;if(player.id===state.selected?.id)button.setAttribute('aria-current','page');
   const avatar=node('span',undefined,'player-result-avatar');if(player.avatar)avatar.append(image(player.avatar));button.append(avatar);const text=node('span',undefined,'player-result-heading');text.append(node('strong',player.name),node('small',player.isPublic===false?t("player.private"):player.isPublic===true?t("player.public"):t("player.unknownPrivacy")));const arrow=node('span','→','player-result-arrow');arrow.setAttribute('aria-hidden','true');button.append(text,arrow,renderPlayerCardRanks(state.cardProfiles?.get(player.id),player.isPublic));const selected=state.favorites?.has(player.id),favorite=node('button',selected?'★':'☆','player-favorite');favorite.type='button';favorite.dataset.playerFavorite=player.id;favorite.setAttribute('aria-pressed',String(!!selected));favorite.setAttribute('aria-label',t("message.4b29f8562447",{"0":(player.name)}));li.append(button,favorite);results.append(li);
  }
  revealResults(results,dedicated||!players.length?'':JSON.stringify(players.map(player=>player.id)));
  if(focus)[...results.querySelectorAll('[data-player-id]')].find(b=>b.dataset.playerId===focus)?.focus({preventScroll:true});
  if(favoriteFocus)([...results.querySelectorAll('[data-player-favorite]')].find(b=>b.dataset.playerFavorite===favoriteFocus)??root.querySelector('#player-query')).focus({preventScroll:true});
  const more=root.querySelector('[data-player-more]');more.hidden=dedicated||state.results.length>=state.total||!state.results.length;more.disabled=state.searchStatus==='loading';
  const profile=root.querySelector('#player-profile');const roleFocused=roleHost?.contains(document.activeElement);const samePlayer=profile.dataset.profilePlayerId===state.selected?.id;const openHeroes=new Set(samePlayer?[...profile.querySelectorAll('details[data-player-hero][open]')].map(el=>el.dataset.playerHero):[]);const heroFocus=samePlayer&&document.activeElement?.matches('[data-player-hero]>summary')?document.activeElement.parentElement.dataset.playerHero:null;profile.dataset.profilePlayerId=state.selected?.id??'';roleCombo?.close();profile.replaceChildren();profile.hidden=!dedicated;profile.setAttribute('aria-busy',String(state.profileStatus==='loading'));
  if(!state.selected)return;
  const summary=state.summary?.data;const heading=node('div',undefined,'player-profile-heading');if(summary?.avatar||state.selected.avatar)heading.append(image(summary?.avatar||state.selected.avatar));
  if(state.background){const background=image(state.background,'player-most-background');background.loading='eager';heading.prepend(background);}
  const title=node('div',undefined,'player-profile-title');title.append(node('h2',summary?.name??state.selected.name));if(summary?.title)title.append(node('p',summary.title));heading.append(title);const favorite=node('button',state.favorites?.has(state.selected.id)?'★':'☆','player-favorite player-profile-favorite');favorite.type='button';favorite.dataset.playerFavorite=state.selected.id;favorite.setAttribute('aria-pressed',String(!!state.favorites?.has(state.selected.id)));favorite.setAttribute('aria-label',t("message.4b29f8562447",{"0":(summary?.name??state.selected.name)}));heading.append(favorite);profile.append(heading);if(favoriteFocus===state.selected.id)favorite.focus({preventScroll:true});
  if(state.summaryStatus==='loading')profile.append(node('p',t("player.loadingSummary")));
  if(state.competitiveStatus==='loading')profile.append(node('p',t("player.loadingStats")));
  if(state.previousSummary||!summary&&state.favorites?.has(state.selected.id))profile.append(node('p',t("player.previous"),'player-source'));
  if(state.private)profile.append(node('p',t("비공개 프로필입니다. 공개되지 않은 전적은 표시하지 않습니다."),'empty-note'));
  if(errorText(state.profileError)){profile.append(node('p',errorText(state.profileError),'player-error'));const retry=node('button',t("player.retry"),'player-more');retry.type='button';retry.dataset.playerRetry='';profile.append(retry);}
  title.append(node('small',state.private?t('player.private'):state.selected.isPublic===true||state.competitiveStatus==='ready'?t('player.public'):t('player.unknownPrivacy'),'player-profile-privacy'));
  if(summary){
   const ranks=node('section',undefined,'player-ranks');ranks.append(node('h3',t("경쟁전 등급 · API 제공 마지막 플레이 시즌")));
   if(!summary.ranks.length)ranks.append(node('p',state.private?t("player.private"):t("등급 정보 없음")));
   for(const platform of ['pc','console']){const platformRanks=summary.ranks.filter(r=>r.platform===platform);if(!platformRanks.length&&platform!=='pc')continue;const group=node('div',undefined,'player-rank-grid');for(const role of ['tank','damage','support','open']){const rank=platformRanks.find(r=>r.role===role);if(role==='open'&&!rank)continue;const slot=node('div',undefined,'player-rank-slot');slot.append(node('small',`${platform==='pc'?'PC':t("콘솔")} · ${ROLES[role]??t("자유 역할")}`));slot.append(rank?renderPlayerRank(rank):node('p',t("등급 정보 없음")));group.append(slot);}ranks.append(group);}heading.append(ranks);
   const meta=node('div',undefined,'player-profile-meta');
   if(summary.endorsement!=null)meta.append(node('p',t("message.a12b1c45561d",{"0":(summary.endorsement)})));
   if(summary.updatedAt!=null)meta.append(node('p',t("message.677ec3ca516e",{"0":(new Date(summary.updatedAt*1000).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'}))}),'player-source'));heading.append(meta);
  }
  const stats=state.competitive?.data;
  if(stats&&!state.private){const section=node('section',undefined,'player-dashboard');
   section.append(node('h3',t('player.competitiveHeading')),renderPlayerOverview(stats.general));
   const toolbar=node('div',undefined,'player-heroes-toolbar');toolbar.append(node('h3',t('player.heroRecords')),roleFilter(state.heroRole));section.append(toolbar,node('p',t('player.timeBarNote'),'player-source'));
   const list=renderPlayerHeroList(stats,heroes,openHeroes,state.heroRole??'all');
   section.append(list.children.length?list:node('p',t(stats.heroes.length?'player.noRoleRecords':'player.noHeroRecords'),'player-role-empty'));profile.append(section);
  }
  const frames=[state.summary,state.competitive].filter(Boolean);if(frames.length){const fetchedAt=Math.max(...frames.map(f=>Date.parse(f.fetchedAt)).filter(Number.isFinite));if(Number.isFinite(fetchedAt))profile.append(node('p',t('ui.sourceTime',{time:new Date(fetchedAt).toLocaleString(formatLocale(),{timeZone:'Asia/Seoul'})}),'player-source'));if(frames.some(f=>f.providerStale))profile.append(node('p',t("\uC624\uB798\uB41C \uB370\uC774\uD130"),'history-warning'));}
  if(heroFocus)[...profile.querySelectorAll('[data-player-hero]')].find(el=>el.dataset.playerHero===heroFocus)?.querySelector('summary')?.focus({preventScroll:true});
  if(roleFocused)roleHost?.querySelector('[role=combobox]')?.focus({preventScroll:true});
  const source=node('a',t("출처: OverFast API"));source.href='https://overfast-api.tekrop.fr/docs';source.target='_blank';source.rel='noopener noreferrer';profile.append(source,node('p',t("API 제공 시즌의 전적이며 현재 시즌·실시간 전적과 다를 수 있습니다. HOW 조회 시각은 경기 집계 종료 시각이 아닙니다."),'player-source'));
 }};
}
