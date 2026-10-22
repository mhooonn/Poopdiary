const assert = require('node:assert/strict');
const { test } = require('node:test');
const { appearanceStorageModule } = require('./modules.cjs');

test('appearance settings default safely and reject unknown values', async () => {
  const { normalizeAppearance } = await appearanceStorageModule;
  assert.equal(normalizeAppearance('dark'), 'dark');
  assert.equal(normalizeAppearance('unknown'), 'system');
  assert.equal(normalizeAppearance(null, 'light'), 'light');
});

test('appearance preference loads and saves using a stable local key', async () => {
  const { APPEARANCE_STORAGE_KEY, createAppearanceStore } = await appearanceStorageModule;
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  };
  const store = createAppearanceStore(storage);

  assert.equal(await store.read(), 'system');
  assert.equal(await store.save('dark'), 'dark');
  assert.equal(values.get(APPEARANCE_STORAGE_KEY), 'dark');
  assert.equal(await store.read(), 'dark');
});

test('appearance save surfaces storage errors to the settings screen', async () => {
  const { createAppearanceStore } = await appearanceStorageModule;
  const store = createAppearanceStore({
    async getItem() { return null; },
    async setItem() { throw new Error('Storage unavailable'); },
  });

  await assert.rejects(store.save('light'), /Storage unavailable/);
});
