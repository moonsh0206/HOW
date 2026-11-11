import {t,label as translateLabel} from '../i18n/i18n.js';
import { node, image } from './dom.js';
export function renderCounters(data) {
  const panel = node('section', undefined, 'counter-panel'); panel.setAttribute('aria-labelledby', 'counter-title');
  const heading = node('h2', t("카운터 영웅")); heading.id = 'counter-title';
  panel.append(heading, node('p', t("5v5 수동 검토 · 등급별 통계 아님"), 'counter-caption'));
  if (data.status === 'error' || !data.counteredBy.length) {
    panel.append(node('p', data.status === 'error' ? t("카운터 정보를 표시할 수 없습니다.") : t("확인된 카운터 정보가 없습니다."), 'empty-note')); return panel;
  }
  const list = node('ul', undefined, 'counter-list');
  for (const hero of data.counteredBy.slice(0, 3)) {
    const item = node('li'); const link = node('a', undefined, 'counter-hero'); link.href = `#/heroes/${hero.heroKey}`;
    const portrait = node('span', hero.name.slice(0, 1), 'counter-portrait');
    if (hero.portrait) portrait.append(image(hero.portrait));
    const text = node('span'); text.append(node('strong', hero.name));
    if (hero.evidenceStatus === 'conflicting') text.append(node('small', t("상황에 따라 유리"), 'counter-condition'));
    link.append(portrait, text); item.append(link);
    const source = node('a', t("참고 자료 ↗"), 'counter-source'); source.href = hero.sourceUrl; source.target = '_blank'; source.rel = 'noreferrer';
    const explanation = node('details', undefined, 'counter-explanation'); explanation.append(node('summary', t("이유")), node('p', translateLabel(hero.reason), 'counter-reason'), node('small', `${hero.engagementType === 'direct' ? t("직접 교전") : hero.engagementType === 'team-utility' ? t("팀 유틸리티 대응") : t("팀 압박")} · ${hero.reviewedAt}`), source);
    explanation.append(node('small', `${hero.counterType === 'both' ? t("기술 + 교전 지표 참고") : hero.counterType === 'statistical' ? t("교전 지표 참고") : t("기술·전략 상성")} · ${hero.evidenceStatus === 'conflicting' ? t("근거 상충") : hero.evidenceStatus === 'confirmed' ? t("검토 확인") : t("조건부")}`));
    for (const conflict of hero.conflicts ?? []) { const note = node('p', translateLabel(conflict.summary)); const link = node('a', t("근거 ↗"), 'counter-source'); link.href = conflict.sourceUrl; link.target = '_blank'; link.rel = 'noreferrer'; note.append(link); explanation.append(note); }
    item.append(explanation); list.append(item);
  }
  panel.append(list); return panel;
}
