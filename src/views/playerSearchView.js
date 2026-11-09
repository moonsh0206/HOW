import {node} from './dom.js';
export function renderPlayerSearch(root){
 if(!root||root.childElementCount)return;
 root.append(node('p','PHASE 4','eyebrow'),node('h1','플레이어 전적 검색 · 개발 예정'),node('p','배틀태그로 플레이어 전적을 확인하는 기능을 준비하고 있습니다.','empty-note'));
 const back=node('a','티어리스트 보기','primary-button');back.href='#/tiers';root.append(back);
}
