import {t,label as translateLabel,getLanguage} from '../i18n/i18n.js';
import {node} from './dom.js';
import {latestHeroPatch} from '../models/officialPatchModel.js';
import {compactText} from './compactText.js';
const labels={buff:t("버프"),nerf:t("너프"),mixed:t("복합 조정"),adjustment:t("조정"),bugfix:t("버그 수정")};
const modeLabels={'live-5v5':t("일반 라이브 5v5"),'live-6v6':t("6v6 전용"),'stadium':t("스타디움 전용")};
function item(c){const element=node('div',undefined,'hero-patch-change');element.dataset.changeId=c.id;element.append(node('h3',translateLabel(c.abilityName)));if(c.before!==null&&c.after!==null)element.append(node('strong',`${c.before} → ${c.after}${c.unit??''}`));else if(c.after!==null)element.append(node('strong',t("message.057653df4c99",{"0":(c.after),"1":(c.unit??'')})));element.append(compactText(translateLabel(c.summaryKo),'patch-summary',35));return element;}
function contents(result){const fragment=document.createDocumentFragment();
 const priority=c=>['quality-of-life','cosmetic'].includes(c.category)?3:c.changeType==='bugfix'?2:c.before!==null&&c.after!==null?0:1;
 const changes=[...result.changes].sort((a,b)=>priority(a)-priority(b));for(const c of changes.slice(0,3))fragment.append(item(c));
 if(changes.length>3){const more=node('details',undefined,'hero-patch-more');more.append(node('summary',t("message.b67d2f151f5a",{"0":(changes.length-3)})));for(const c of changes.slice(3))more.append(item(c));fragment.append(more);}return fragment;
}
export function renderHeroPatch(archive,key){
 const results=['live-5v5','live-6v6','stadium'].map(mode=>latestHeroPatch(archive,key,mode)).filter(Boolean),result=results.shift();if(!result)return null;
 const {patch,changeType}=result,section=node('section',undefined,'hero-patch-panel');section.setAttribute('aria-label',t("최근 패치 변경사항"));
 const header=node('div',undefined,'hero-patch-heading');header.append(node('h2',t("최근 패치 변경사항")),node('span',labels[changeType],`patch-change-tag patch-${changeType}`));section.append(header,node('small',t("message.8de92593187b",{"0":(patch.publishedDate.replaceAll('-','.')),"1":(modeLabels[result.gameMode])})),contents(result));
 for(const other of results){const group=node('details',undefined,'hero-patch-mode');group.append(node('summary',t("message.63a12fe0a4f8",{"0":(modeLabels[other.gameMode]),"1":(other.changes.length)})),node('small',other.patch.publishedDate.replaceAll('-','.')),contents(other));const source=node('a',t("이 모드 공식 패치노트 ↗"));source.href=getLanguage()==='en'?other.patch.sourceUrlEn:other.patch.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';group.append(source);section.append(group);}
 const link=node('a',t("공식 패치노트 ↗"));link.href=getLanguage()==='en'?patch.sourceUrlEn:patch.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';section.append(link);return section;
}
