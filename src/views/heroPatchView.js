import {node} from './dom.js';
import {latestHeroPatch} from '../models/officialPatchModel.js';
const labels={buff:'버프',nerf:'너프',mixed:'복합 조정',adjustment:'조정',bugfix:'버그 수정'};
const modeLabels={'live-5v5':'일반 라이브 5v5','live-6v6':'6v6 전용','stadium':'스타디움 전용'};
function item(c){const element=node('div',undefined,'hero-patch-change');element.dataset.changeId=c.id;element.append(node('h3',c.abilityName));if(c.before!==null&&c.after!==null)element.append(node('strong',`${c.before} → ${c.after}${c.unit??''}`));else if(c.after!==null)element.append(node('strong',`변경 후 ${c.after}${c.unit??''}`));element.append(node('p',c.summaryKo));return element;}
function contents(result){const fragment=document.createDocumentFragment();
 const priority=c=>['quality-of-life','cosmetic'].includes(c.category)?3:c.changeType==='bugfix'?2:c.before!==null&&c.after!==null?0:1;
 const changes=[...result.changes].sort((a,b)=>priority(a)-priority(b));for(const c of changes.slice(0,3))fragment.append(item(c));
 if(changes.length>3){const more=node('details',undefined,'hero-patch-more');more.append(node('summary',`변경사항 더 보기 (${changes.length-3}건)`));for(const c of changes.slice(3))more.append(item(c));fragment.append(more);}return fragment;
}
export function renderHeroPatch(archive,key){
 const results=['live-5v5','live-6v6','stadium'].map(mode=>latestHeroPatch(archive,key,mode)).filter(Boolean),result=results.shift();if(!result)return null;
 const {patch,changeType}=result,section=node('section',undefined,'hero-patch-panel');section.setAttribute('aria-label','최근 패치 변경사항');
 const header=node('div',undefined,'hero-patch-heading');header.append(node('h2','최근 패치 변경사항'),node('span',labels[changeType],`patch-change-tag patch-${changeType}`));section.append(header,node('small',`${patch.publishedDate.replaceAll('-','.')} · ${modeLabels[result.gameMode]} · 공식 노트 기준`),contents(result));
 for(const other of results){const group=node('details',undefined,'hero-patch-mode');group.append(node('summary',`${modeLabels[other.gameMode]} 변경 (${other.changes.length}건)`),node('small',other.patch.publishedDate.replaceAll('-','.')),contents(other));const source=node('a','이 모드 공식 패치노트 ↗');source.href=other.patch.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';group.append(source);section.append(group);}
 const link=node('a','공식 패치노트 ↗');link.href=patch.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';section.append(link);return section;
}
