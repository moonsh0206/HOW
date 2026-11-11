import {apiLocale} from '../i18n/i18n.js';
import { normalizeHeroes } from '../models/heroModel.js';

// Provider contract: getHeroes() -> Promise<{ heroes: Hero[], fetchedAt: string }>.
// Statistics providers are deliberately separate from hero metadata providers.
export function createOverfastService({ fetcher = globalThis.fetch, baseUrl = 'https://overfast-api.tekrop.fr', timeoutMs = 12000, locale = apiLocale } = {}) {
  const cache=new Map(),requests=new Map();
  return {
    getHeroes() {
      const lang=locale();const cached=cache.get(lang),pending=requests.get(lang);
      if (cached) return Promise.resolve(cached);
      if (pending) return pending;
      const request = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetcher(`${baseUrl}/heroes?locale=${encodeURIComponent(lang)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(response.status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.' : `영웅 서버가 응답하지 않습니다. (HTTP ${response.status})`);
          const heroes = normalizeHeroes(await response.json());
          const result = { heroes, fetchedAt: new Date().toISOString() };cache.set(lang,result);
          return result;
        } catch (error) {
          if (error.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다. 다시 시도해 주세요.');
          if (error instanceof TypeError) throw new Error('네트워크 연결 또는 API 접근 상태를 확인해 주세요.');
          throw error;
        } finally { clearTimeout(timeout); requests.delete(lang); }
      })();
      requests.set(lang,request);return request;
    },
  };
}
