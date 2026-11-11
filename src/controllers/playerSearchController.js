import {t} from '../i18n/i18n.js';
import {playerQuery,playerPath,topPlayerHeroes} from '../models/playerModel.js';
import {createPlayerSearchView} from '../views/playerSearchView.js';
import {createPlayerFavoritesStorage,favoriteProfile} from '../storage/playerFavoritesStorage.js';
export function createPlayerSearchController({root,provider,heroes=()=>[],heroDetails,onNavigate,favoritesStorage=createPlayerFavoritesStorage(),view=createPlayerSearchView(root)}){
 const saved=favoritesStorage.load();
 const state={favorites:new Map(saved.players.map(p=>[p.id,p])),favoritesNotice:saved.available?'':t("즐겨찾기 저장소를 읽을 수 없습니다. 이번 화면에서만 사용할 수 있습니다."),cardProfiles:new Map(),mode:'search',background:null,searchStatus:'idle',searchError:'',results:[],total:0,selected:null,profileStatus:'idle',profileError:'',summary:null,competitive:null,private:false};
 let active=false,searchGeneration=0,profileGeneration=0,query='',backgroundKey=null;
 let rankActive=0,rankQueue=[],rankBudget=20,rankBlocked=false;
 const candidates=()=>[...state.results,...state.favorites.values(),...(state.selected?[{...state.selected,name:state.summary?.data?.name??state.selected.name,avatar:state.summary?.data?.avatar??state.selected.avatar}]:[])];
 const render=()=>{if(active){state.showFavorites=state.searchStatus==='idle';state.displayPlayers=state.showFavorites?[...state.favorites.values()]:state.results;view.render(state,heroes());view.observeRanks?.(state.mode==='search'?loadCard:null);}};
 function updateCard(id,entry){state.cardProfiles.set(id,entry);if(active&&state.mode==='search')view.updateRanks?.(id,entry,candidates().find(p=>p.id===id)?.isPublic);}
 function pumpRanks(){
  if(!active||state.mode!=='search'||rankBlocked)return;
  while(rankActive<2&&rankQueue.length){const {id,token}=rankQueue.shift();if(token!==searchGeneration)continue;rankActive++;updateCard(id,{status:'loading'});
   Promise.resolve().then(()=>provider.summary(id)).then(frame=>{if(active&&token===searchGeneration)updateCard(id,{status:'ready',frame});}).catch(error=>{
    if(!active||token!==searchGeneration)return;updateCard(id,{status:'error'});
    if(['rate-limit','upstream-limit'].includes(error.code)){rankBlocked=true;for(const pending of rankQueue)updateCard(pending.id,{status:'error'});rankQueue=[];}
   }).finally(()=>{rankActive--;pumpRanks();});
  }
 }
 function loadCard(id){const player=candidates().find(p=>p.id===id);if(!active||state.mode!=='search'||!player||player.isPublic===false||state.cardProfiles.has(id)||rankBlocked||rankBudget<=0)return;
  rankBudget--;updateCard(id,{status:'queued'});rankQueue.push({id,token:searchGeneration});pumpRanks();
 }
 function loadMostBackground(token){
  const most=topPlayerHeroes(state.competitive?.data,heroes()).most,key=`${token}:${most?.key}`;
  if(!most||!heroDetails||state.background||backgroundKey===key)return;backgroundKey=key;
  Promise.resolve().then(()=>heroDetails.getHero(most.key)).then(result=>{if(!active||token!==profileGeneration)return;const backgrounds=result.detail?.backgrounds??[];state.background=(backgrounds.find(b=>b.sizes?.includes('xl+'))??backgrounds[0])?.url??null;render();}).catch(()=>{});
 }
 async function search(value,more=false){
  if(typeof value==='string'&&!value.trim()){reset({focus:true});return;}
  let normalized;try{normalized=playerQuery(value);}catch(error){++searchGeneration;++profileGeneration;state.searchStatus='error';state.searchError=error.message;render();return;}
  if(!active)return;query=normalized;const token=++searchGeneration;
  rankQueue=[];rankBudget=20;rankBlocked=false;
  if(!more)state.cardProfiles=new Map();else for(const [id,entry]of state.cardProfiles)if(['queued','loading'].includes(entry.status))state.cardProfiles.delete(id);
  if(!more){++profileGeneration;Object.assign(state,{mode:'search',results:[],total:0,selected:null,summary:null,competitive:null,profileStatus:'idle',profileError:'',private:false});}
  state.searchStatus='loading';state.searchError='';render();
  try{const frame=await provider.search(query,more?state.results.length:0);if(!active||token!==searchGeneration)return;
   state.results=more?[...new Map([...state.results,...frame.data.players].map(p=>[p.id,p])).values()]:frame.data.players;state.total=frame.data.total;state.searchStatus='ready';
  }catch(error){if(!active||token!==searchGeneration)return;state.searchStatus='error';state.searchError=error.message;}
  render();
 }
 async function select(id){
  let canonical;try{canonical=playerPath(id);}catch{return;}const player=candidates().find(p=>playerPath(p.id)===canonical)??{id,name:id,isPublic:null};if(!active)return;const token=++profileGeneration;
  const previous=(state.selected?.id===id?state.summary:state.cardProfiles.get(id)?.frame)??state.favorites.get(id)?.profile;
  Object.assign(state,{mode:'profile',background:null,selected:player,profileStatus:'loading',profileError:'',summary:previous??null,competitive:null,summaryStatus:'loading',competitiveStatus:player.isPublic===false?'unavailable':'loading',summaryError:'',competitiveError:'',previousSummary:!!previous,private:player.isPublic===false});render();
  const valid=()=>active&&token===profileGeneration;
  async function part(kind,method){
   try{const frame=await provider[method](id,{retry:true});if(!valid()||state.private&&kind==='competitive')return;state[kind]=frame;state[kind+'Status']='ready';if(kind==='summary'){state.previousSummary=false;state.cardProfiles.set(id,{status:'ready',frame});if(state.favorites.has(id)){state.favorites.set(id,{...state.favorites.get(id),name:frame.data.name,avatar:frame.data.avatar,profile:favoriteProfile(frame)});if(!favoritesStorage.save(state.favorites.values()))state.favoritesNotice=t("저장된 프로필 정보를 갱신하지 못했습니다.");}}loadMostBackground(token);
   }catch(error){if(!valid())return;if(error.code==='private'){state[kind+'Status']='unavailable';state.private=true;state.competitive=null;state.competitiveStatus='unavailable';}else{state[kind+'Status']='error';state[kind+'Error']=error.message;}}
   if(valid()){state.profileStatus=[state.summaryStatus,state.competitiveStatus].includes('loading')?'loading':state.summaryStatus==='error'||state.competitiveStatus==='error'?'error':'ready';state.profileError=[state.summaryError,state.competitiveError].filter(Boolean).join(' / ');render();}
  }
  await Promise.allSettled([part('summary','summary'),...(!state.private?[part('competitive','competitive')]:[])]);
 }

 const submit=event=>{event.preventDefault();search(root.querySelector('#player-query').value);};
 function toggleFavorite(id){const player=candidates().find(p=>p.id===id);if(!player)return;if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.set(id,{id:player.id,name:player.name,avatar:player.avatar,isPublic:player.isPublic,profile:favoriteProfile(state.selected?.id===id?state.summary:state.cardProfiles.get(id)?.frame)});state.favoritesNotice=favoritesStorage.save(state.favorites.values())?'':t("즐겨찾기를 저장하지 못했습니다. 현재 화면의 선택은 유지됩니다.");render();}
 function reset({focus=false}={}){++searchGeneration;++profileGeneration;query='';backgroundKey=null;rankQueue=[];rankBudget=20;rankBlocked=false;Object.assign(state,{cardProfiles:new Map(),mode:'search',background:null,searchStatus:'idle',searchError:'',results:[],total:0,selected:null,profileStatus:'idle',profileError:'',summary:null,competitive:null,private:false});const input=root.querySelector('#player-query');input.value='';render();if(focus)input.focus();}
 const click=event=>{const favorite=event.target.closest('[data-player-favorite]');if(favorite){event.preventDefault();event.stopPropagation();toggleFavorite(favorite.dataset.playerFavorite);return;}const id=event.target.closest('[data-player-id]')?.dataset.playerId;if(id){if(onNavigate){event.preventDefault();onNavigate(id);}else{event.preventDefault();select(id);}}else if(event.target.closest('[data-player-more]'))search(query,true);else if(event.target.closest('[data-player-retry]'))select(state.selected?.id);else if(event.target.closest('[data-player-search-again]'))reset({focus:true});};
 root.querySelector('form').addEventListener('submit',submit);root.addEventListener('click',click);
 return {state,search,select,loadCard,reset,toggleFavorite,setRoute(id){state.mode=id?'profile':'search';if(id){if(!state.selected||playerPath(state.selected.id)!==playerPath(id)||state.profileStatus==='idle')select(id);else{if(state.profileStatus==='ready')loadMostBackground(profileGeneration);render();}}else{++profileGeneration;if(state.profileStatus==='loading')state.profileStatus='idle';render();pumpRanks();}},setActive(value){if(active===value)return;active=value;if(!active){++searchGeneration;++profileGeneration;rankQueue=[];for(const [id,entry]of state.cardProfiles)if(['queued','loading'].includes(entry.status))state.cardProfiles.delete(id);view.observeRanks?.(null);if(state.searchStatus==='loading')state.searchStatus='idle';if(state.profileStatus==='loading'){state.profileStatus='idle';state.selected=null;state.summary=null;state.competitive=null;}}render();},stop(){active=false;++searchGeneration;++profileGeneration;rankQueue=[];view.observeRanks?.(null);root.querySelector('form').removeEventListener('submit',submit);root.removeEventListener('click',click);}};
}
