import {node} from './dom.js';
import {CURRENT_PATCH_NOTE as note} from '../data/currentPatchNote.js';
export function renderPatchNote(){
  const card=node('section',undefined,'patch-note-card');card.id='current-patch-note';card.setAttribute('aria-labelledby','patch-note-title');
  const title=node('h2','이번 패치 노트');title.id='patch-note-title';
  card.append(title,node('p',`${note.dateKo.replaceAll('-','.')} · ${note.label}`,'patch-note-date'),node('p',note.summary,'patch-note-summary'));
  const details=node('details');details.append(node('summary','주요 변경 보기'));const list=node('ul');for(const change of note.changes)list.append(node('li',change));details.append(list);card.append(details);
  const link=node('a','공식 패치노트 보기 ↗','patch-note-link');link.href=note.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
  const info=node('small','통계 집계 패치와 별도','patch-note-info');info.title='패치노트 날짜만으로 현재 통계의 집계 구간을 확정하지 않습니다.';card.append(info);return card;
}
// Move the same links, never duplicate them or reset the disclosure's open state.
export function setPatchNoteMobile(card,mobile){
 const target=mobile?card.querySelector('details'):card;
 for(const selector of ['.patch-note-link','.patch-note-info']){const element=card.querySelector(selector);if(element&&element.parentElement!==target)target.append(element);}
}
