import { META_POLICY, S_REQUIREMENTS } from '../domain/meta.js';
import { filterLabel } from '../models/statisticsModel.js';
const labels = { cohortSize: '완전한 역할 데이터 수', winRate: '승률 (%)', pickRate: '픽률 (%)', winPercentile: '승률 백분위', pickPercentile: '픽률 백분위' };
function node(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
export function formulaText() {
  const w = META_POLICY.weights;
  const r = S_REQUIREMENTS;
  return `역할 내 백분위: 승률 ${w.winRate * 100}% + 픽률 ${w.pickRate * 100}% + 밴률 ${w.banRate * 100}%. S 자격: 역할 데이터 ${r.cohortSize}명 이상, 승률 ≥${r.winRate}%, 픽률 ≥${r.pickRate}%, 승률 백분위 ≥${r.winPercentile}, 픽률 백분위 ≥${r.pickPercentile}. 미충족 시 최대 A, 빈 S는 채우지 않습니다. 표본 수 미제공 · 인기와 밴은 전투 성능의 직접 증거가 아닙니다.`;
}
export function tierButton(hero) {
  const button = node('button', hero.tier ?? '미분류'); button.type = 'button'; button.dataset.tier = hero.key;
  button.className = hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : 'unavailable';
  button.setAttribute('aria-label', `${hero.name} ${hero.tier ?? '미분류'} 산정 근거`); return button;
}
export function showTierReason(hero, state) {
  document.querySelector('#tier-reason-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'tier-reason-dialog'; dialog.className = 'tier-reason-dialog'; dialog.setAttribute('aria-labelledby', 'tier-reason-title');
  const title = node('h2', `${hero.name} · ${hero.tier ?? '미분류'} 산정 근거`); title.id = 'tier-reason-title';
  dialog.append(title, node('p', formulaText()));
  if (hero.metaScore == null) dialog.append(node('p', '승률·픽률·밴률 중 유효한 통계가 누락되어 점수와 티어를 제공하지 않습니다. 0과 누락은 구분합니다.'));
  else {
    dialog.append(node('p', `Meta Score ${hero.metaScore.toFixed(2)} / 100 · 역할 ${hero.roleRank}위 / ${hero.roleSize}명 · 순위 기준 ${hero.provisionalTier} → 최종 ${hero.tier}${hero.capped ? ' (S 자격 제한)' : ''}`));
    for (const [field, label, q] of [['winRate', '승률', hero.winPercentile], ['pickRate', '픽률', hero.pickPercentile], ['banRate', '밴률', hero.banPercentile]]) dialog.append(node('p', `${label} ${hero.statistics[field]}% → 백분위 ${q.toFixed(2)} × ${META_POLICY.weights[field]} = ${(q * META_POLICY.weights[field]).toFixed(2)}`));
    const list = document.createElement('ul');
    for (const rule of hero.eligibility) list.append(node('li', `${rule.passed ? '충족' : '미충족'} · ${labels[rule.field]}: ${rule.value?.toFixed(2) ?? '미제공'} ≥ ${rule.minimum}`));
    dialog.append(list, node('p', '동점은 평균 백분위와 공동 순위(1, 1, 3)를 사용합니다. S/A/B/C 누적 경계는 역할 인원의 15/30/50/75%를 올림합니다. 이는 HOW 정책이며 통계적 유의성을 뜻하지 않습니다.'));
  }
  dialog.append(node('p', `${filterLabel(state.statsFilters)} · OverFast API · HOW 조회 ${state.statistics?.fetchedAt ?? '미제공'}${state.statistics?.stale || state.statsStatus === 'error' ? ' · 오래된 데이터/갱신 실패' : ''} · 원본 집계 시각 미제공`));
  const close = node('button', '닫기'); close.type = 'button'; close.addEventListener('click', () => dialog.close()); dialog.append(close);
  const previous = document.activeElement;
  dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); }, { once: true });
  document.body.append(dialog); dialog.showModal(); close.focus();
}
