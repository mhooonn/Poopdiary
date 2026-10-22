export const APPEARANCE_STORAGE_KEY = 'gutlog.appearance.v1';

/** @typedef {'light' | 'dark' | 'system'} Appearance */
/** @typedef {{getItem:(key:string)=>Promise<string|null>,setItem:(key:string,value:string)=>Promise<void>}} KeyValueStorage */

/** @param {unknown} value @param {Appearance} [fallback] @returns {Appearance} */
export function normalizeAppearance(value, fallback = 'system') {
  return value === 'light' || value === 'dark' || value === 'system' ? value : fallback;
}

/** @param {KeyValueStorage} storage */
export function createAppearanceStore(storage) {
  return {
    /** @param {Appearance} [fallback] */
    async read(fallback = 'system') {
      return normalizeAppearance(await storage.getItem(APPEARANCE_STORAGE_KEY), fallback);
    },
    /** @param {unknown} value */
    async save(value) {
      const appearance = normalizeAppearance(value);
      await storage.setItem(APPEARANCE_STORAGE_KEY, appearance);
      return appearance;
    },
  };
}
