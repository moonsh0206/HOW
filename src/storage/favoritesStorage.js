const KEY = 'how:favorites:v1';
const validKeys = value => Array.isArray(value) && value.every(key => typeof key === 'string' && /^[a-z0-9-]+$/.test(key));
export function createFavoritesStorage(getStorage = () => globalThis.localStorage) {
  return {
    load() {
      try { const data = JSON.parse(getStorage().getItem(KEY) ?? '[]'); return { keys: validKeys(data) ? [...new Set(data)] : [], available: true }; }
      catch { return { keys: [], available: false }; }
    },
    save(keys) {
      try { getStorage().setItem(KEY, JSON.stringify([...keys])); return true; } catch { return false; }
    },
  };
}
