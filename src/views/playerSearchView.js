import {node,image} from './dom.js';
import {ROLES} from '../models/heroModel.js';
import {topPlayerHeroes,formatPlayerTime} from '../models/playerModel.js';
import {renderPlayerRank} from './playerRankView.js';
import {renderPlayerCardRanks} from './playerCardRanksView.js';
import {playerHeroColor} from '../data/playerHeroColors.js';
const value=v=>v==null?'정보 없음':String(v);
const time=formatPlayerTime;
export const PLAYER_EMPTY_IMAGE=`${import.meta.env?.BASE_URL??'/'}assets/illustrations/HOW_kinetic_grasp_clean.png`;
export function renderPlayerSearch(root){
 if(!root||root.childElementCount)return;
 const back=node('a','← 전적 검색으로 돌아가기','player-back');back.href='#/player-search';back.hidden=true;root.append(back);
 root.append(node('p','PLAYER PROFILE','eyebrow'),node('h1','플레이어 전적 검색'));
 const form=node('form');form.id='player-search-form';const label=node('label','닉네임 또는 배틀태그');label.htmlFor='player-query';
 const input=node('input');input.id='player-query';input.type='search';input.placeholder='닉네임 또는 이름#1234';input.maxLength=80;input.required=true;input.autocomplete='off';
 const button=node('button','검색','primary-button');button.type='submit';form.append(label,input,button);root.append(form);
 root.append(node('p','공개 프로필만 제공되며, PC 경쟁전 통계는 HOW 영웅 티어 필터와 별도로 조회합니다.','player-guide'));
 const status=node('p');status.id='player-search-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const results=node('ul');results.id='player-results';results.setAttribute('aria-label','플레이어 검색 결과');
 const more=node('button','결과 더 보기','player-more');more.type='button';more.dataset.playerMore='';more.hidden=true;
 const favoritesTitle=node('h2','즐겨찾기한 플레이어','player-favorites-title');favoritesTitle.hidden=true;
 const favoritesNotice=node('p',undefined,'player-favorites-notice');favoritesNotice.setAttribute('role','status');
 const empty=node('section',undefined,'player-search-empty');empty.hidden=true;empty.setAttribute('aria-label','검색 결과 없음');const illustration=image(PLAYER_EMPTY_IMAGE);illustration.alt='기계식 손과 푸른 중력 소용돌이';illustration.width=1672;illustration.height=941;
 const again=node('button','다시 검색','primary-button');again.type='button';again.dataset.playerSearchAgain='';empty.append(illustration,node('h2','해당 계정을 찾을 수 없습니다'),node('p','닉네임이나 배틀태그를 다시 확인해 주세요.'),node('p','비공개 프로필이거나 API에서 검색되지 않는 계정일 수도 있습니다.'),again);
 const profile=node('section');profile.id='player-profile';profile.setAttribute('aria-label','선택한 플레이어 프로필');root.append(status,favoritesNotice,favoritesTitle,results,more,empty,profile);
}
export function createPlayerSearchView(root){
 renderPlayerSearch(root);
 let observer;
 return {observeRanks(callback){observer?.disconnect();observer=null;if(!callback||!root.ownerDocument.defaultView.IntersectionObserver)return;
  observer=new root.ownerDocument.defaultView.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);callback(entry.target.dataset.playerId);}},{rootMargin:'80px'});
  for(const card of root.querySelectorAll('#player-results [data-player-id]'))observer.observe(card);
 },updateRanks(id,entry,isPublic){const card=[...root.querySelectorAll('#player-results [data-player-id]')].find(c=>c.dataset.playerId===id);card?.querySelector('.player-card-ranks')?.replaceWith(renderPlayerCardRanks(entry,isPublic));},render(state,heroes=[]){
  const dedicated=state.mode==='profile';root.classList.toggle('player-profile-page',dedicated);
  for(const child of root.children)if(child.id!=='player-profile'&&!child.classList.contains('player-back'))child.hidden=dedicated;
  root.querySelector('.player-back').hidden=!dedicated;
  const players=state.displayPlayers??state.results;
  const isEmpty=state.searchStatus==='ready'&&state.total===0&&state.results.length===0;
  root.querySelector('.player-search-empty').hidden=dedicated||!isEmpty;
  root.querySelector('.player-favorites-title').hidden=dedicated||!state.showFavorites||!players.length;
  const notice=root.querySelector('.player-favorites-notice');notice.textContent=state.favoritesNotice??'';notice.hidden=dedicated||!notice.textContent;
  const status=root.querySelector('#player-search-status');status.textContent=state.searchStatus==='loading'?'플레이어 검색 중…':state.searchStatus==='error'?state.searchError:state.searchStatus==='ready'?state.results.length?`${state.total}명 검색됨 · ${state.results.length}명 표시`:'검색 결과가 없습니다.':state.showFavorites&&players.length?'저장한 플레이어를 선택해 전적을 확인하세요.':'닉네임 또는 배틀태그를 입력해 주세요.';
  status.dataset.state=state.searchStatus;root.querySelector('#player-search-form').setAttribute('aria-busy',String(state.searchStatus==='loading'));
  const results=root.querySelector('#player-results'),focus=root.ownerDocument.activeElement?.dataset.playerId,favoriteFocus=root.ownerDocument.activeElement?.dataset.playerFavorite;results.replaceChildren();
  for(const player of players){const li=node('li');li.className='player-result-card';const button=node('a');button.href=`#/players/${encodeURIComponent(player.id)}`;button.dataset.playerId=player.id;if(player.id===state.selected?.id)button.setAttribute('aria-current','page');
   const avatar=node('span',undefined,'player-result-avatar');if(player.avatar)avatar.append(image(player.avatar));button.append(avatar);const text=node('span',undefined,'player-result-heading');text.append(node('strong',player.name),node('small',player.isPublic===false?'비공개':player.isPublic===true?'공개 프로필':'공개 여부 미확인'));const arrow=node('span','→','player-result-arrow');arrow.setAttribute('aria-hidden','true');button.append(text,arrow,renderPlayerCardRanks(state.cardProfiles?.get(player.id),player.isPublic));const selected=state.favorites?.has(player.id),favorite=node('button',selected?'★':'☆','player-favorite');favorite.type='button';favorite.dataset.playerFavorite=player.id;favorite.setAttribute('aria-pressed',String(!!selected));favorite.setAttribute('aria-label',`${player.name} 플레이어 즐겨찾기`);li.append(button,favorite);results.append(li);
  }
  if(focus)[...results.querySelectorAll('[data-player-id]')].find(b=>b.dataset.playerId===focus)?.focus({preventScroll:true});
  if(favoriteFocus)([...results.querySelectorAll('[data-player-favorite]')].find(b=>b.dataset.playerFavorite===favoriteFocus)??root.querySelector('#player-query')).focus({preventScroll:true});
  const more=root.querySelector('[data-player-more]');more.hidden=dedicated||state.results.length>=state.total||!state.results.length;more.disabled=state.searchStatus==='loading';
  const profile=root.querySelector('#player-profile');profile.replaceChildren();profile.hidden=!dedicated;profile.setAttribute('aria-busy',String(state.profileStatus==='loading'));
  if(!state.selected)return;
  const summary=state.summary?.data;const heading=node('div',undefined,'player-profile-heading');if(summary?.avatar||state.selected.avatar)heading.append(image(summary?.avatar||state.selected.avatar));
  if(state.background){const background=image(state.background,'player-most-background');background.loading='eager';heading.prepend(background);}
  const title=node('div');title.append(node('h2',summary?.name??state.selected.name));if(summary?.title)title.append(node('p',summary.title));heading.append(title);profile.append(heading);
  if(state.profileStatus==='loading')profile.append(node('p','공개 프로필과 경쟁전 전적을 불러오는 중…'));
  if(state.private)profile.append(node('p','비공개 프로필입니다. 공개되지 않은 전적은 표시하지 않습니다.','empty-note'));
  if(state.profileError){profile.append(node('p',state.profileError,'player-error'));const retry=node('button','다시 시도','player-more');retry.type='button';retry.dataset.playerRetry='';profile.append(retry);}
  if(summary){
   const ranks=node('section',undefined,'player-ranks');ranks.append(node('h3','경쟁전 등급 · API 제공 마지막 플레이 시즌'));
   if(!summary.ranks.length)ranks.append(node('p',state.private?'비공개':'등급 정보 없음'));
   for(const platform of ['pc','console']){const platformRanks=summary.ranks.filter(r=>r.platform===platform);if(!platformRanks.length)continue;const group=node('div',undefined,'player-rank-grid');for(const role of ['tank','damage','support','open']){const rank=platformRanks.find(r=>r.role===role);if(role==='open'&&!rank)continue;const slot=node('div',undefined,'player-rank-slot');slot.append(node('small',`${platform==='pc'?'PC':'콘솔'} · ${ROLES[role]??'자유 역할'}`));slot.append(rank?renderPlayerRank(rank):node('p','등급 정보 없음'));group.append(slot);}ranks.append(group);}heading.append(ranks);
   if(summary.endorsement!=null)profile.append(node('p',`추천 레벨 ${summary.endorsement}`));
   if(summary.updatedAt!=null)profile.append(node('p',`Blizzard 프로필 갱신: ${new Date(summary.updatedAt*1000).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}`,'player-source'));
  }
  const stats=state.competitive?.data;
  if(stats&&!state.private){const section=node('section');section.append(node('h3','PC 경쟁전 전적'));
   const general=stats.general;section.append(node('p',general?`플레이 ${time(general.seconds)} · ${value(general.played)}경기 · ${value(general.won)}승 / ${value(general.lost)}패 · 승률 ${general.winRate==null?'정보 없음':general.winRate+'%'}`:'경쟁전 요약 정보 없음'));
   section.append(node('h3','TOP HEROES · 경쟁전 플레이 시간'));
   const top=topPlayerHeroes(stats,heroes),list=node('ul',undefined,'player-hero-stats');for(const hero of top.heroes){const li=node('li');li.dataset.role=hero.role??'unknown';li.dataset.heroKey=hero.key;li.style.setProperty('--player-hero-color',playerHeroColor(hero.key));if(hero.portrait)li.append(image(hero.portrait));const content=node('div');content.append(node('strong',hero.name),node('p',`플레이 ${time(hero.seconds)} · ${value(hero.played)}경기 · ${value(hero.won)}승 / ${value(hero.lost)}패`),node('p',`승률 ${hero.winRate==null?'정보 없음':hero.winRate+'%'} · KDA ${value(hero.kda)}`));if(hero.barPercent!=null){const bar=node('div',undefined,'player-time-bar');bar.setAttribute('role','meter');bar.setAttribute('aria-label',`${hero.name} 플레이 시간 ${time(hero.seconds)} · 모스트 대비`);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(hero.barPercent));const fill=node('span');fill.style.width=`${hero.barPercent}%`;bar.append(fill);content.append(bar);}li.append(content);list.append(li);}section.append(stats.heroes.length?list:node('p','영웅별 경쟁전 정보 없음'));profile.append(section);
  }
  const frames=[state.summary,state.competitive].filter(Boolean);for(const [i,frame]of frames.entries())profile.append(node('p',`${i===0?'프로필':'전적'} HOW 조회 ${new Date(frame.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · ${frame.cached?'브라우저 캐시 재사용':'API 조회'} · 제공처 Age ${frame.providerAgeSeconds==null?'정보 없음':frame.providerAgeSeconds+'초'}${frame.providerStale?' · 제공처 오래된 캐시':''}`,'player-source'));
  const source=node('a','출처: OverFast API');source.href='https://overfast-api.tekrop.fr/docs';source.target='_blank';source.rel='noopener noreferrer';profile.append(source,node('p','API 제공 시즌의 전적이며 현재 시즌·실시간 전적과 다를 수 있습니다. HOW 조회 시각은 경기 집계 종료 시각이 아닙니다.','player-source'));
 }};
}
