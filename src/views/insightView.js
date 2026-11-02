import { hiddenGems, hotHeroes, classifyMeta } from '../domain/insights.js';
import { node, image } from './dom.js';
import { filterLabel } from '../models/statisticsModel.js';

function recommendation(hero, hot = false, category = '') {
  const link = node('a', undefined, 'insight-hero'); link.href = `#/heroes/${hero.key}`;
  if (hero.portrait) link.append(image(hero.portrait));
  const text = node('span'); text.append(node('strong', hero.name));
  text.append(node('small', hot ? `픽률 +${hero.pickDelta.toFixed(1)}%p · 승률 ${hero.winDelta >= 0 ? '+' : ''}${hero.winDelta.toFixed(1)}%p` : category === 'contestedPicks' ? `밴률 ${hero.statistics.banRate.toFixed(1)}% · 역할 내 밴률 1위` : `승률 ${hero.statistics.winRate == null ? '미제공' : hero.statistics.winRate.toFixed(1) + '%'} · 픽률 ${hero.statistics.pickRate == null ? '미제공' : hero.statistics.pickRate.toFixed(1) + '%'}`));
  link.append(text); return link;
}
export function createInsightView() {
  return {
    render(model) {
      const { state } = model; const heroes = model.enrichedHeroes();
      const hot = document.querySelector('#hot-content'), gems = document.querySelector('#gems-content');
      hot.replaceChildren(); gems.replaceChildren();
      const current = state.statsStatus === 'loading' || state.statsStatus === 'error' ? null : state.statistics;
      const trend = hotHeroes(heroes, current, state.previousSnapshot);
      if (trend.available) {
        for (const hero of trend.heroes) hot.append(recommendation(hero, true));
        if (!trend.heroes.length) hot.append(node('p', '비교 가능한 통계는 있으나 선정 기준을 충족한 영웅이 없습니다.'));
        hot.append(node('small', `HOW 수집/조회 ${new Date(trend.previousAt).toLocaleString('ko-KR')} → ${new Date(trend.currentAt).toLocaleString('ko-KR')}`));
      } else hot.append(node('p', state.snapshotStatus === 'loading' ? '이전 실제 통계 확인 중' : state.snapshotStatus === 'error' ? `추세 미제공 · ${state.snapshotError}` : trend.reason));
      hot.append(node('small', '같은 조회 조건의 이전 통계와 비교합니다.'));
      const candidates = current && !current.stale ? hiddenGems(heroes) : [];
      for (const hero of candidates) gems.append(recommendation(hero));
      if (!candidates.length) gems.append(node('p', current && !current.stale ? '현재 조건에서 선정 기준을 충족한 영웅이 없습니다.' : '최신 통계를 확보하면 후보를 제공합니다.'));
      gems.append(node('small', '현재 통계에서 주목할 만한 영웅입니다.'));
      const categories = current && !current.stale ? classifyMeta(heroes) : {};
      for (const category of ['highWinRate', 'popularPicks', 'contestedPicks']) {
        const content = document.querySelector(`[data-category="${category}"]`); content.replaceChildren();
        for (const hero of categories[category] ?? []) content.append(recommendation(hero, false, category));
        if (!categories[category]?.length) content.append(node('p', '현재 조건에서 제공할 수 있는 영웅이 없습니다.'));
        content.append(node('small', '역할별 대표 영웅 · 공식 순위가 아닙니다.'));
      }
      document.querySelector('#insight-cohort').textContent = `${filterLabel(state.statsFilters)} · 전체 역할 기준 · HOW 정책 추천`;
    },
  };
}
