import { normalizeStatistics, statisticsQuery, validateFilters } from '../models/statisticsModel.js';

export const STATISTICS_TTL = 60 * 60 * 1000;
export function createStatisticsService({ fetcher = globalThis.fetch, now = Date.now, timeoutMs = 12000, ttlMs = STATISTICS_TTL, baseUrl = 'https://overfast-api.tekrop.fr' } = {}) {
  const cache = new Map(), pending = new Map(), failures = new Map();
  const fallback = (cached, failure) => {
    if (!cached) throw new Error(failure.message);
    return { ...cached, stale: true, error: failure.message, retryAt: failure.retryAt };
  };
  return {
    getStatistics(input) {
      let filters, key;
      try { filters = validateFilters(input); key = statisticsQuery(filters); } catch (error) { return Promise.reject(error); }
      const cached = cache.get(key);
      if (cached && now() < cached.expiresAt) return Promise.resolve({ ...cached, stale: false, error: '' });
      if (pending.has(key)) return pending.get(key);
      const failure = failures.get(key);
      if (failure && now() < failure.retryAt) {
        try { return Promise.resolve(fallback(cached, failure)); } catch (error) { return Promise.reject(error); }
      }
      const request = (async () => {
        await Promise.resolve(); // Register pending before even a synchronous fetcher failure.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let retryMs = 60000;
        try {
          const response = await fetcher(`${baseUrl}/heroes/stats?${key}`, { signal: controller.signal });
          if (!response.ok) {
            const header = response.headers?.get('retry-after');
            if (header) {
              const delay = /^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - now();
              if (Number.isFinite(delay)) retryMs = Math.max(60000, Math.min(delay, 86400000));
            }
            throw new Error(response.status === 429 ? '통계 요청이 제한되었습니다. 잠시 후 다시 확인해 주세요. (429)' : response.status === 503 ? '통계 제공처가 일시적으로 응답하지 않습니다. (503)' : `통계 요청 실패 (HTTP ${response.status})`);
          }
          const records = normalizeStatistics(await response.json());
          const ageHeader = response.headers?.get('age');
          const age = ageHeader != null && /^\d+$/.test(ageHeader) ? Number(ageHeader) : 0;
          const timestamp = now();
          const result = { records, filters, fetchedAt: new Date(timestamp).toISOString(), expiresAt: timestamp + Math.max(60000, ttlMs - age * 1000), source: 'OverFast API', aggregateAt: null, stale: false, error: '' };
          cache.set(key, result); failures.delete(key);
          return result;
        } catch (error) {
          const message = error.name === 'AbortError' ? '통계 응답 시간이 초과되었습니다.' : error instanceof TypeError ? '통계 네트워크 또는 CORS 연결을 확인해 주세요.' : error instanceof SyntaxError ? '통계 JSON 응답을 읽을 수 없습니다.' : error.message;
          const failure = { message: `${message} 최소 ${Math.ceil(retryMs / 1000)}초 뒤 다시 확인합니다.`, retryAt: now() + retryMs };
          failures.set(key, failure);
          return fallback(cached, failure);
        } finally { clearTimeout(timeout); pending.delete(key); }
      })();
      pending.set(key, request);
      return request;
    },
  };
}
