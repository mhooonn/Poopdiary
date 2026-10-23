const PHOTO_NAME = /^photo-[a-z0-9-]+\.jpg$/;

/** @param {unknown} value */
function isPhotoName(value) {
  return typeof value === 'string' && PHOTO_NAME.test(value);
}

/** @param {string|null} raw @returns {Record<string, string>} */
export function parseFoodPhotoIndex(raw) {
  if (raw === null) return {};

  try {
    const value = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

    return Object.fromEntries(Object.entries(value).filter(([id, name]) =>
      /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && isPhotoName(name)));
  } catch {
    return {};
  }
}

/** @param {{storage:{getItem:(key:string)=>Promise<string|null>,setItem:(key:string,value:string)=>Promise<void>,removeItem:(key:string)=>Promise<void>},files:{
 * saveDraft:(uri:string,width:number,height:number)=>Promise<string>,
 * draftUri:(name:string)=>string,
 * promoteDraft:(name:string)=>Promise<string>,
 * entryUri:(name:string)=>string,
 * entryExists:(name:string)=>Promise<boolean>,
 * deleteDraft:(name:string)=>Promise<void>,
 * deleteEntry:(name:string)=>Promise<void>
 * },environment?:string}} dependencies */
export function createFoodPhotoStore({ storage, files, environment = 'default' }) {
  // Keep each API environment's photo links separate when the same device runs different builds.
  const scope = encodeURIComponent(environment.trim().replace(/\/+$/, '') || 'unconfigured');
  const indexKey = `gutlog.foodPhotos.v1:${scope}`;
  const pendingKey = `gutlog.foodPhotos.pending.v1:${scope}`;

  async function readIndex() {
    return parseFoodPhotoIndex(await storage.getItem(indexKey));
  }

  async function recoverPendingAttachment() {
    // The marker makes the file move recoverable if the app closes between moving the file and updating the index.
    const raw = await storage.getItem(pendingKey);
    if (raw === null) return;

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      await storage.removeItem(pendingKey);
      return;
    }

    if (!pending || !Number.isSafeInteger(pending.foodId) || pending.foodId <= 0 || !isPhotoName(pending.name)) {
      await storage.removeItem(pendingKey);
      return;
    }

    const id = String(pending.foodId);
    const index = await readIndex();
    await files.promoteDraft(pending.name);
    if (index[id] !== pending.name) {
      index[id] = pending.name;
      await storage.setItem(indexKey, JSON.stringify(index));
    }
    await storage.removeItem(pendingKey);

    if (isPhotoName(pending.previousName) && pending.previousName !== pending.name) {
      await files.deleteEntry(pending.previousName).catch(() => undefined);
    }
  }

  /** @param {number} foodId */
  function validId(foodId) {
    if (!Number.isSafeInteger(foodId) || foodId <= 0) {
      throw new Error('Choose a valid food entry.');
    }
    return String(foodId);
  }

  return {
    /** @param {string} uri @param {number} width @param {number} height */
    saveDraft: (uri, width, height) => files.saveDraft(uri, width, height),

    /** @param {string} name */
    draftUri(name) {
      if (!isPhotoName(name)) throw new Error('The meal photo is no longer available.');
      return files.draftUri(name);
    },

    /** @param {number} foodId */
    async getPhotoUri(foodId) {
      const id = validId(foodId);
      await recoverPendingAttachment();
      const index = await readIndex();
      const name = index[id];
      if (!name) return null;

      if (await files.entryExists(name)) return files.entryUri(name);

      // The index can outlive a file after a user clears app storage; remove that stale link quietly.
      delete index[id];
      await storage.setItem(indexKey, JSON.stringify(index));
      return null;
    },

    /** @param {number} foodId @param {string} name */
    async attachDraft(foodId, name) {
      const id = validId(foodId);
      if (!isPhotoName(name)) throw new Error('The meal photo could not be saved.');

      await recoverPendingAttachment();
      const index = await readIndex();
      const previous = index[id];
      // Record the pending move before touching the file so a restart can finish the attachment.
      await storage.setItem(pendingKey, JSON.stringify({ foodId, name, previousName: previous ?? null }));
      const uri = await files.promoteDraft(name);
      index[id] = name;
      await storage.setItem(indexKey, JSON.stringify(index));
      await storage.removeItem(pendingKey);

      if (previous && previous !== name) {
        await files.deleteEntry(previous).catch(() => undefined);
      }
      return uri;
    },

    /** @param {string} name */
    async discardDraft(name) {
      if (!isPhotoName(name)) return;
      const index = await readIndex();
      // Never delete a draft name that is already linked to a saved entry.
      if (Object.values(index).includes(name)) return;
      await files.deleteDraft(name);
      await files.deleteEntry(name);
    },

    /** @param {number} foodId */
    async removePhoto(foodId) {
      const id = validId(foodId);
      await recoverPendingAttachment();
      const index = await readIndex();
      const name = index[id];
      if (!name) return;

      await files.deleteEntry(name);
      delete index[id];
      await storage.setItem(indexKey, JSON.stringify(index));
    },
  };
}
