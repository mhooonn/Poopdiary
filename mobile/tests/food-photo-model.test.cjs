const assert = require('node:assert/strict');
const { test } = require('node:test');
const { foodPhotoModelModule } = require('./modules.cjs');

function fakeFiles() {
  const drafts = new Set();
  const entries = new Set();
  return {
    drafts,
    entries,
    async saveDraft() { drafts.add('photo-new-1.jpg'); return 'photo-new-1.jpg'; },
    draftUri: (name) => `file:///drafts/${name}`,
    async promoteDraft(name) {
      if (entries.has(name)) return `file:///entries/${name}`;
      if (!drafts.delete(name)) throw new Error('Missing draft');
      entries.add(name);
      return `file:///entries/${name}`;
    },
    entryUri: (name) => `file:///entries/${name}`,
    async entryExists(name) { return entries.has(name); },
    async deleteDraft(name) { drafts.delete(name); },
    async deleteEntry(name) { entries.delete(name); },
  };
}

test('photo index rejects invalid IDs and path-like filenames', async () => {
  const { parseFoodPhotoIndex } = await foodPhotoModelModule;
  assert.deepEqual(parseFoodPhotoIndex(null), {});
  assert.deepEqual(parseFoodPhotoIndex('{bad json'), {});
  assert.deepEqual(parseFoodPhotoIndex(JSON.stringify({
    1: 'photo-valid-1.jpg',
    0: 'photo-zero.jpg',
    '-2': 'photo-negative.jpg',
    3: '../private.jpg',
    nope: 'photo-nope.jpg',
  })), { 1: 'photo-valid-1.jpg' });
});

test('attaching a replacement updates its record and removes the old image', async () => {
  const { createFoodPhotoStore } = await foodPhotoModelModule;
  const files = fakeFiles();
  files.entries.add('photo-old-1.jpg');
  const values = new Map([['gutlog.foodPhotos.v1:default', JSON.stringify({ 7: 'photo-old-1.jpg' })]]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  const store = createFoodPhotoStore({ storage, files });
  await store.saveDraft('camera://image', 1200, 900);

  assert.equal(await store.attachDraft(7, 'photo-new-1.jpg'), 'file:///entries/photo-new-1.jpg');
  assert.equal(await store.getPhotoUri(7), 'file:///entries/photo-new-1.jpg');
  assert.deepEqual([...files.entries], ['photo-new-1.jpg']);
  assert.equal(files.drafts.size, 0);
});

test('photo attachment can be retried after the local index write fails', async () => {
  const { createFoodPhotoStore } = await foodPhotoModelModule;
  const files = fakeFiles();
  files.entries.add('photo-old-1.jpg');
  files.drafts.add('photo-new-1.jpg');
  const values = new Map([['gutlog.foodPhotos.v1:default', JSON.stringify({ 7: 'photo-old-1.jpg' })]]);
  let fail = true;
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) {
      if (key.startsWith('gutlog.foodPhotos.v1:') && fail) { fail = false; throw new Error('Storage unavailable'); }
      values.set(key, value);
    },
    async removeItem(key) { values.delete(key); },
  };
  const store = createFoodPhotoStore({ storage, files });

  await assert.rejects(store.attachDraft(7, 'photo-new-1.jpg'), /Storage unavailable/);
  await store.attachDraft(7, 'photo-new-1.jpg');
  assert.equal(await store.getPhotoUri(7), 'file:///entries/photo-new-1.jpg');
  assert.deepEqual([...files.entries], ['photo-new-1.jpg']);
});

test('removing a Food photo clears its local association and file', async () => {
  const { createFoodPhotoStore } = await foodPhotoModelModule;
  const files = fakeFiles();
  files.entries.add('photo-saved-1.jpg');
  const values = new Map([['gutlog.foodPhotos.v1:default', JSON.stringify({ 8: 'photo-saved-1.jpg' })]]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  const store = createFoodPhotoStore({ storage, files });
  await store.removePhoto(8);
  assert.equal(await store.getPhotoUri(8), null);
  assert.equal(files.entries.size, 0);
});

test('a later app session recovers a photo attachment interrupted after file promotion', async () => {
  const { createFoodPhotoStore } = await foodPhotoModelModule;
  const files = fakeFiles();
  files.drafts.add('photo-new-1.jpg');
  const values = new Map();
  let failIndexWrite = true;
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) {
      if (key.startsWith('gutlog.foodPhotos.v1:') && failIndexWrite) {
        failIndexWrite = false;
        throw new Error('Storage unavailable');
      }
      values.set(key, value);
    },
    async removeItem(key) { values.delete(key); },
  };
  const firstSession = createFoodPhotoStore({ storage, files });

  await assert.rejects(firstSession.attachDraft(9, 'photo-new-1.jpg'), /Storage unavailable/);
  assert.equal(files.entries.has('photo-new-1.jpg'), true);

  const nextSession = createFoodPhotoStore({ storage, files });
  assert.equal(await nextSession.getPhotoUri(9), 'file:///entries/photo-new-1.jpg');
  assert.equal(values.has('gutlog.foodPhotos.pending.v1:default'), false);
});

test('photo indexes are isolated between API environments with reused record IDs', async () => {
  const { createFoodPhotoStore } = await foodPhotoModelModule;
  const files = fakeFiles();
  files.drafts.add('photo-new-1.jpg');
  files.drafts.add('photo-new-2.jpg');
  const values = new Map();
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
  const localStore = createFoodPhotoStore({ storage, files, environment: 'http://localhost:3000/' });
  const hostedStore = createFoodPhotoStore({ storage, files, environment: 'https://api.example.test' });
  await localStore.attachDraft(7, 'photo-new-1.jpg');
  await hostedStore.attachDraft(7, 'photo-new-2.jpg');

  assert.equal(await localStore.getPhotoUri(7), 'file:///entries/photo-new-1.jpg');
  assert.equal(await hostedStore.getPhotoUri(7), 'file:///entries/photo-new-2.jpg');
});
