import {node} from './dom.js';
import {CURRENT_PATCH_NOTE as note} from '../data/currentPatchNote.js';
export function renderPatchNote(){
  const card=node('section',undefined,'patch-note-card');card.id='current-patch-note';card.setAttribute('aria-labelledby','patch-note-title');
  const title=node('h2','이번 패치 노트');title.id='patch-note-title';
  const heroChanges=note.heroChanges,changedCount=Object.keys(heroChanges).length;
  card.append(title,node('p',`${note.dateKo.replaceAll('-','.')} · ${note.label} · ${note.mode}`,'patch-note-date'),node('p',note.summary));
  card.append(node('p',`일반 5대5 변경 영웅 ${changedCount}명 · 주요 변경 ${note.featuredHeroes.length}명`,'patch-note-count'));
  const highlights=node('ul',undefined,'patch-highlights');
  for(const key of note.featuredHeroes){const hero=heroChanges[key];if(!hero)continue;const item=node('li');item.append(node('strong',`${hero.name} · ${hero.impact} `),document.createTextNode(hero.summary));highlights.append(item);}
  card.append(highlights);
  // Source link is placed before the internal hero links and remains visibly accessible.
  const source=node('a','공식 패치노트 보기 ↗','patch-source');source.href=note.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';card.append(source);
  const details=node('details',undefined,'patch-all-heroes');details.append(node('summary',`변경 영웅 ${changedCount}명 모두 보기`));
  const list=node('ul');
  for(const [key,hero] of Object.entries(heroChanges)){
    const item=node('li'),link=node('a',`${hero.name} · ${hero.impact}`);link.href=`#/heroes/${key}`;
    item.append(link,document.createTextNode(` — ${hero.summary}`));list.append(item);
  }
  details.append(list);card.append(details);
  const info=node('small','LLM 보조 요약 · 공식 수치 대조 · 현재 통계 집계 패치와 별도');info.title='패치노트 날짜만으로 현재 통계의 집계 구간을 확정하지 않습니다.';card.append(info);
  return card;
}
