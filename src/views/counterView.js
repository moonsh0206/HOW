import { node, image } from './dom.js';
export function renderCounters(data) {
  const panel = node('section', undefined, 'counter-panel'); panel.setAttribute('aria-labelledby', 'counter-title');
  const heading = node('h2', '카운터 영웅'); heading.id = 'counter-title';
  panel.append(heading, node('p', '5v5 수동 검토 · 등급별 통계 아님', 'counter-caption'));
  if (data.status === 'error' || !data.counteredBy.length) {
    panel.append(node('p', data.status === 'error' ? '카운터 정보를 표시할 수 없습니다.' : '확인된 카운터 정보가 없습니다.', 'empty-note')); return panel;
  }
  const list = node('ul', undefined, 'counter-list');
  for (const hero of data.counteredBy.slice(0, 3)) {
    const item = node('li'); const link = node('a', undefined, 'counter-hero'); link.href = `#/heroes/${hero.heroKey}`;
    const portrait = node('span', hero.name.slice(0, 1), 'counter-portrait');
    if (hero.portrait) portrait.append(image(hero.portrait));
    const text = node('span'); text.append(node('strong', hero.name));
    if (hero.evidenceStatus === 'conflicting') text.append(node('small', '상황에 따라 유리', 'counter-condition'));
    link.append(portrait, text); item.append(link);
    const source = node('a', '참고 자료 ↗', 'counter-source'); source.href = hero.sourceUrl; source.target = '_blank'; source.rel = 'noreferrer';
    const explanation = node('details', undefined, 'counter-explanation'); explanation.append(node('summary', '이유'), node('p', hero.reason, 'counter-reason'), node('small', `${hero.engagementType === 'direct' ? '직접 교전' : hero.engagementType === 'team-utility' ? '팀 유틸리티 대응' : '팀 압박'} · ${hero.reviewedAt}`), source);
    explanation.append(node('small', `${hero.counterType === 'both' ? '기술 + 교전 지표 참고' : hero.counterType === 'statistical' ? '교전 지표 참고' : '기술·전략 상성'} · ${hero.evidenceStatus === 'conflicting' ? '근거 상충' : hero.evidenceStatus === 'confirmed' ? '검토 확인' : '조건부'}`));
    for (const conflict of hero.conflicts ?? []) { const note = node('p', conflict.summary); const link = node('a', '근거 ↗', 'counter-source'); link.href = conflict.sourceUrl; link.target = '_blank'; link.rel = 'noreferrer'; note.append(link); explanation.append(note); }
    item.append(explanation); list.append(item);
  }
  panel.append(list); return panel;
}
