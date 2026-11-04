import {node,image} from './dom.js';
export function renderSynergies(data){
 const panel=node('section',undefined,'synergy-panel');panel.setAttribute('aria-labelledby','synergy-title');const title=node('h2','시너지 영웅');title.id='synergy-title';panel.append(title,node('p','5v5 기술·전술 연계 · 듀오 승률 순위 아님','counter-caption'));
 if(!data.allies?.length){panel.append(node('p',data.status==='error'?'시너지 정보를 표시할 수 없습니다.':'검토된 시너지 정보가 없습니다.','empty-note'));return panel;}
 const list=node('ul',undefined,'counter-list');
 for(const hero of data.allies.slice(0,3)){
  const li=node('li'),link=node('a',undefined,'counter-hero');link.href=`#/heroes/${hero.allyHeroKey}`;const portrait=node('span',hero.name.slice(0,1),'counter-portrait');if(hero.portrait)portrait.append(image(hero.portrait));const name=node('strong',hero.name);link.append(portrait,name);
  const explanation=node('details',undefined,'counter-explanation');explanation.append(node('summary','이유'),node('p',hero.reason,'counter-reason'),node('small',`${hero.synergyType==='tactical'?'전술 연계':'기술 연계'} · ${hero.reviewedAt}`));
  for(const url of hero.sourceUrls){const source=node('a','공식 기술 ↗','counter-source');source.href=url;source.target='_blank';source.rel='noreferrer';explanation.append(source);}li.append(link,explanation);list.append(li);
 }
 panel.append(list);return panel;
}
