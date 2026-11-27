import {t,label as translateLabel} from '../i18n/i18n.js';
import {metaTierEmblem} from './metaTierEmblem.js';
import {META_V22_POLICY} from '../domain/metaV22Policy.js';
const tierDescription=hero=>hero?.tierPolicy===META_V22_POLICY.version?t('meta.v22DamageRule'):translateLabel(recommendationDescription(hero??{}))||translateLabel(TIER_HELP);
export const TIER_HELP = t("HOW 메타 티어는 실제 통계를 바탕으로 종합 평가한 결과입니다.");
let opener;
function node(tag, text) { const el = document.createElement(tag); el.textContent = text; return el; }
export function tierButton(hero) {
  const button = node('button', hero.tier ?? t("미분류")); button.type = 'button'; button.dataset.tier = hero.key;
  button.className = hero.tier ? `tier-badge tier-${hero.tier.toLowerCase()}` : 'unavailable';
  if(hero.tier)button.replaceChildren(metaTierEmblem(hero.tier));
  const label = translateLabel(recommendationLabel(hero));
  if (label) { const note = node('small',label); note.className='recommendation-label'; button.append(note); }
  button.title = tierDescription(hero);
  button.setAttribute('aria-label', t("message.a5e25b264cf9",{"0":(hero.name),"1":(hero.tier ?? t("미분류")),"2":(label)}));
  return button;
}
export function closeTierHelp() {
  const tip = document.querySelector('#tier-tooltip');
  if (!tip) return;
  if (tip.hidePopover) tip.hidePopover(); else tip.hidden = true;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}
// Existing tier clicks open only a short hint; the calculation remains in Domain.
export function showTierReason(hero) {
  opener = document.activeElement;
  let tip = document.querySelector('#tier-tooltip');
  if (!tip) {
    tip = node('div', ''); tip.id = 'tier-tooltip'; tip.className = 'tier-tooltip';
    tip.setAttribute('popover', 'auto'); tip.setAttribute('role', 'note');
    tip.append(node('span', translateLabel(TIER_HELP)));
    const close = node('button', '×'); close.type = 'button'; close.setAttribute('aria-label', t("티어 안내 닫기"));
    close.addEventListener('click', closeTierHelp); tip.append(close); document.body.append(tip);
    tip.addEventListener('keydown', event => { if (event.key === 'Escape') closeTierHelp(); });
  }
  tip.querySelector('span').textContent = tierDescription(hero);
  if (tip.showPopover) tip.showPopover();
  else { tip.hidden = false; tip.querySelector('button').focus(); }
}
import {recommendationLabel,recommendationDescription} from '../domain/recommendationPolicy.js';
