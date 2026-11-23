import {t,label as translateLabel,getLanguage,officialLink} from '../i18n/i18n.js';
import {node} from './dom.js';
export function renderPatchNote(note=null){
  note??={dateKo:null,label:t("공식 패치 정보 확인 중"),summary:t("공식 자료를 불러오고 있습니다."),changes:[],sourceUrl:'https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/'};
  const card=node('section',undefined,'patch-note-card');card.id='current-patch-note';card.setAttribute('aria-labelledby','patch-note-title');
  const title=node('h2',t("이번 패치 노트"));title.id='patch-note-title';
  const system=note.heroChangeCount===0&&note.systemChanges?.find(c=>c.ruleKey==='champion-group-width');
  const summary=system?t('patch.competitiveWidth',{before:system.before,after:system.after}):translateLabel(note.summary);
  card.append(title,node('p',`${note.dateKo?note.dateKo.replaceAll('-','.')+' · ':''}${translateLabel(note.label)}`,'patch-note-date'),node('p',summary,'patch-note-summary'));
  if(note.heroChangeCount!==0&&note.changes.length){const details=node('details');details.append(node('summary',t("주요 변경 보기")));const list=node('ul');for(const change of note.changes)list.append(node('li',translateLabel(change)));details.append(list);card.append(details);}
  const link=node('a',t("공식 패치노트 보기 ↗"),'patch-note-link');link.href=officialLink(note.sourceUrl);link.target='_blank';link.rel='noopener noreferrer';card.append(link);
  const info=node('small',t("통계 집계 패치와 별도"),'patch-note-info');info.title=t("패치노트 날짜만으로 현재 통계의 집계 구간을 확정하지 않습니다.");card.append(info);return card;
}
export function updatePatchNote(card,note){
 if(!note)return;const signature=getLanguage()+JSON.stringify(note);if(card.dataset.signature===signature)return;
 const open=card.querySelector('details')?.open,focus=card.contains(document.activeElement)?document.activeElement:null;
 const selector=focus?.tagName==='SUMMARY'?'summary':focus?.tagName==='A'?'.patch-note-link':null;
 const mobile=!!card.querySelector('details .patch-note-link'),next=renderPatchNote(note);card.replaceChildren(...next.childNodes);card.dataset.signature=signature;const details=card.querySelector('details');if(details)details.open=!!open;setPatchNoteMobile(card,mobile);if(selector)(card.querySelector(selector)??card.querySelector('.patch-note-link'))?.focus({preventScroll:true});
}
// Move the same links, never duplicate them or reset the disclosure's open state.
export function setPatchNoteMobile(card,mobile){
 const target=mobile?(card.querySelector('details')??card):card;
 for(const selector of ['.patch-note-summary','.patch-note-link','.patch-note-info']){const element=card.querySelector(selector);if(element&&element.parentElement!==target){if(selector==='.patch-note-summary'&&!mobile)card.querySelector('details').before(element);else target.append(element);}}
}
