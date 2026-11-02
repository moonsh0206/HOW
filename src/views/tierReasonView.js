export const TIER_HELP = 'HOW 메타 티어는 실제 통계를 바탕으로 종합 평가한 결과입니다.';
let opener;
function node(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
export function tierButton(hero) {
  const button = node('button', hero.tier ?? '미분류'); button.type = 'button'; button.dataset.tier = hero.key;
  button.className = hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : 'unavailable';
  button.title = TIER_HELP;
  button.setAttribute('aria-label', `${hero.name} ${hero.tier ?? '미분류'} 티어 안내`);
  return button;
}
export function closeTierHelp() {
  const tip = document.querySelector('#tier-tooltip');
  if (!tip) return;
  if (tip.hidePopover) tip.hidePopover(); else tip.hidden = true;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}
// Existing tier clicks open only a short hint; the calculation remains in Domain.
export function showTierReason() {
  opener = document.activeElement;
  let tip = document.querySelector('#tier-tooltip');
  if (!tip) {
    tip = node('div', ''); tip.id = 'tier-tooltip'; tip.className = 'tier-tooltip';
    tip.setAttribute('popover', 'auto'); tip.setAttribute('role', 'note');
    tip.append(node('span', TIER_HELP));
    const close = node('button', '×'); close.type = 'button'; close.setAttribute('aria-label', '티어 안내 닫기');
    close.addEventListener('click', closeTierHelp); tip.append(close); document.body.append(tip);
    tip.addEventListener('keydown', event => { if (event.key === 'Escape') closeTierHelp(); });
  }
  if (tip.showPopover) tip.showPopover();
  else { tip.hidden = false; tip.querySelector('button').focus(); }
}
