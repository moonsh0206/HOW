import {apiLocale} from '../i18n/i18n.js';
import { normalizeHeroDetail } from '../models/heroDetailModel.js';

export function createHeroDetailService({ fetcher = globalThis.fetch, now = Date.now, timeoutMs = 12000, locale = apiLocale } = {}) {
  const cache = new Map(), pending = new Map(), retry = new Map();
  return {
    getHero(key) {
      if (!/^[a-z0-9-]+$/.test(key)) return Promise.reject(new Error('올바르지 않은 영웅 경로입니다.'));
      const lang=locale(),cacheKey=lang+':'+key;
      const cached = cache.get(cacheKey);
      if (cached && now() < cached.expiresAt) return Promise.resolve(cached);
      if (pending.has(cacheKey)) return pending.get(cacheKey);
      if (retry.get(cacheKey)?.at > now()) return Promise.reject(new Error(retry.get(cacheKey).message));
      const request = (async () => {
        await Promise.resolve();
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
        let retryMs = 60000;
        try {
          const response = await fetcher(`https://overfast-api.tekrop.fr/heroes/${key}?locale=${encodeURIComponent(lang)}`, { signal: controller.signal });
          if (!response.ok) {
            const header = response.headers?.get('retry-after');
            if (header) {
              const delay = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - now();
              if (Number.isFinite(delay)) retryMs = Math.max(60000, Math.min(delay, 86400000));
            }
            throw new Error(response.status === 404 ? '영웅을 찾을 수 없습니다. (404)' : `영웅 상세 연결 실패 (${response.status}). 잠시 후 다시 시도해 주세요.`);
          }
          const detail = normalizeHeroDetail(await response.json(), key);
          const result = { detail, fetchedAt: new Date(now()).toISOString(), expiresAt: now() + 86400000 };
          cache.set(cacheKey, result); retry.delete(cacheKey); return result;
        } catch (error) {
          const message = error.name === 'AbortError' ? '영웅 상세 응답 시간이 초과되었습니다.' : error instanceof TypeError ? '영웅 상세 네트워크/CORS 연결을 확인해 주세요.' : error.message;
          retry.set(cacheKey, { at: now() + retryMs, message: `${message} 최소 ${Math.ceil(retryMs / 1000)}초 후 재시도할 수 있습니다.` });
          throw new Error(message);
        } finally { clearTimeout(timer); pending.delete(cacheKey); }
      })(); pending.set(cacheKey, request); return request;
    },
  };
}
