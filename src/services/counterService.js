import { COUNTER_RELATIONS } from '../data/counters.js';
import { normalizeCounters, selectCounters } from '../models/counterModel.js';
export function createCounterService(raw = COUNTER_RELATIONS) {
  let records, error;
  try { records = normalizeCounters(raw); } catch (cause) { records = []; error = cause.message; }
  return {
    getHeroCounters(heroKey, heroes) {
      const result = selectCounters(records, heroKey, heroes);
      return { ...result, status: error ? 'error' : result.counteredBy.length ? 'ready' : 'empty' };
    },
  };
}
