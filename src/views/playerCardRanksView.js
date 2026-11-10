import {node} from './dom.js';
import {renderPlayerRank} from './playerRankView.js';
import {ROLES} from '../models/heroModel.js';
export function renderPlayerCardRanks(entry,isPublic){
 const box=node('div',undefined,'player-card-ranks');
 if(isPublic===false){box.append(node('small','비공개 · 등급 정보 없음'));return box;}
 if(entry?.status!=='ready'){
  box.append(node('small',entry?.status==='error'?'등급 조회 불가 · 프로필에서 확인':entry?.status==='loading'?'등급 확인 중…':'카드 표시 시 등급 확인'));return box;
 }
 const ranks=entry.frame.data.ranks.filter(r=>r.platform==='pc'),season=ranks.find(r=>r.season!=null)?.season;
 box.append(node('small',`PC 경쟁전${season!=null?' · 시즌 '+season:''}`,'player-card-season'));
 for(const role of ['tank','damage','support']){const slot=node('span',undefined,'player-card-rank');slot.append(node('small',ROLES[role]));const rank=ranks.find(r=>r.role===role);slot.append(rank?renderPlayerRank(rank):node('small','정보 없음'));box.append(slot);}
 return box;
}
