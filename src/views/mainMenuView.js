import {renderPlayerSearch} from './playerSearchView.js';
export function createMainMenuView(){
 const meta=document.querySelector('#meta-page'),player=document.querySelector('#player-search-page');
 renderPlayerSearch(player);
 const favorites=document.querySelector('.favorites-summary');
 const favoriteHome=document.createComment('Favorite preview original desktop position');if(favorites)favorites.before(favoriteHome);
 return {render(route,origin='#/tiers',mobile=true){
  if(favorites&&meta){const focused=favorites.contains(document.activeElement)?document.activeElement:null;
   if(mobile&&favorites.parentElement?.id!=='heroes')document.querySelector('#heroes')?.append(favorites);
   else if(!mobile&&favorites.previousSibling!==favoriteHome)favoriteHome.after(favorites);
   if(focused?.isConnected)focused.focus({preventScroll:true});
  }
  if(meta)meta.hidden=route.page!=='meta'||!mobile;if(player)player.hidden=!['player-search','player'].includes(route.page);
  const page=route.page==='detail'?'list':route.page==='player'?'player-search':route.page;
  for(const link of document.querySelectorAll('[data-main-menu]')){
   if(link.dataset.mainMenu===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  for(const link of document.querySelectorAll('.site-header .desktop-header-link')){
   const target=link.getAttribute('href')==='#/player-search'?'player-search':'list';
   if(target===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
 }};
}
