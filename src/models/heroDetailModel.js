import { safeImage, ROLES } from './heroModel.js';

export function normalizeHeroDetail(raw, key) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim() || !Object.hasOwn(ROLES, raw.role)) throw new Error('영웅 상세 응답이 올바르지 않습니다.');
  if (raw.perks != null && (typeof raw.perks !== 'object' || Array.isArray(raw.perks))) throw new Error('특전 응답 형식이 올바르지 않습니다.');
  const list = (value, kind) => {
    if (value == null) return [];
    if (!Array.isArray(value)) throw new Error(`${kind} 목록 형식이 올바르지 않습니다.`);
    return value.map(item => {
      if (!item || typeof item.name !== 'string' || !item.name.trim() || typeof item.description !== 'string') throw new Error(`${kind} 항목 검증에 실패했습니다.`);
      return { name: item.name, description: item.description, icon: safeImage(item.icon), video: item.video ? { thumbnail: safeImage(item.video.thumbnail), mp4: safeImage(item.video.link?.mp4), webm: safeImage(item.video.link?.webm) } : null };
    });
  };
  if (raw.backgrounds != null && !Array.isArray(raw.backgrounds)) throw new Error('배경 목록 형식이 올바르지 않습니다.');
  return {
    key, name: raw.name, role: raw.role, portrait: safeImage(raw.portrait), description: typeof raw.description === 'string' ? raw.description : '',
    backgrounds: (raw.backgrounds ?? []).map(item => ({ url: safeImage(item?.url), sizes: Array.isArray(item?.sizes) ? item.sizes.filter(size => typeof size === 'string') : [] })).filter(item => item.url),
    abilities: list(raw.abilities, '기술'), minor: list(raw.perks?.minor, 'Minor 특전'), major: list(raw.perks?.major, 'Major 특전'), passiveClassification: 'unavailable',
  };
}
