import data from '../data/subroles.json' with { type: 'json' };

export function validateSubroles(input = data) {
  if (!input?.effects || !input?.heroes) throw new Error('하위 역할 데이터가 없습니다.');
  const roles = new Set(['tank','damage','support']);
  const source = value => { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'overwatch.blizzard.com'; } catch { return false; } };
  for (const [key, effect] of Object.entries(input.effects)) {
    if (effect.subroleKey !== key || !roles.has(effect.parentRole) || !effect.subroleNameKo || !effect.descriptionKo || !source(effect.sourceUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(effect.reviewedAt)) throw new Error('하위 역할 효과 검증 실패');
    if (effect.mark) {
      const mark=effect.mark, url=new URL(mark.url);
      if (url.protocol!=='https:' || url.hostname!=='blz-contentstack-images.akamaized.net' || url.pathname.split('/').at(-1).toLowerCase()!==`${key}.svg` || !source(mark.sourceUrl) || mark.displayAllowed && mark.permission!=='approved') throw new Error('하위 역할 마크 검증 실패');
    }
  }
  for (const [key, hero] of Object.entries(input.heroes)) {
    if (!/^[a-z0-9-]+$/.test(key) || input.effects[hero.subroleKey]?.parentRole !== hero.parentRole || !roles.has(hero.parentRole) || !source(hero.sourceUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(hero.reviewedAt)) throw new Error('영웅 하위 역할 매핑 검증 실패');
  }
  return input;
}
validateSubroles();

export function getHeroSubrole(heroKey, parentRole, apiSubrole) {
  const mapping = data.heroes[heroKey];
  if (!mapping || mapping.parentRole !== parentRole) return null;
  // An unknown or conflicting provider key must not silently select another effect.
  if (apiSubrole != null && apiSubrole !== mapping.subroleKey) return null;
  return { ...data.effects[mapping.subroleKey], ...(mapping.descriptionKo ? { descriptionKo: mapping.descriptionKo } : {}), heroSourceUrl: mapping.sourceUrl };
}
