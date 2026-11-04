import { ALL_RANK_FILTERS, validateFilters,isCompositeDivision } from '../src/models/statisticsModel.js';
export function parseSnapshotFilters(args = []) {
  const filters = { ...ALL_RANK_FILTERS }, seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], key = flag?.slice(2), value = args[i + 1];
    if (!flag?.startsWith('--') || !['platform','gamemode','region','division','map'].includes(key) || seen.has(key) || !value || value.startsWith('--')) throw new Error('수집 옵션 형식이 올바르지 않습니다.');
    seen.add(key); filters[key] = value;
  }
  if(isCompositeDivision(filters.division))throw new Error('합성 등급은 저장하지 않습니다. 개별 등급을 수집하세요.');
  return validateFilters(filters);
}
