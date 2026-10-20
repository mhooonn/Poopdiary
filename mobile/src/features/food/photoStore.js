import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { apiBaseUrl } from '../../config/api';
import { createFoodPhotoStore } from './photoModel';

const root = new Directory(Paths.document, 'food-photos');
const drafts = new Directory(root, 'drafts');
const entries = new Directory(root, 'entries');

function ensureDirectories() {
  root.create({ idempotent: true, intermediates: true });
  drafts.create({ idempotent: true, intermediates: true });
  entries.create({ idempotent: true, intermediates: true });
}

function fileName() {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.jpg`;
}

const files = {
  /** @param {string} uri @param {number} width @param {number} height */
  async saveDraft(uri, width, height) {
    ensureDirectories();
    const context = ImageManipulator.manipulate(uri);
    if (width > 1600 || height > 1600) {
      context.resize(width >= height ? { width: 1600 } : { height: 1600 });
    }

    let image;
    try {
      image = await context.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
      const name = fileName();
      await new File(result.uri).move(new File(drafts, name));
      return name;
    } finally {
      image?.release();
      context.release();
    }
  },

  /** @param {string} name */
  draftUri: (name) => new File(drafts, name).uri,

  /** @param {string} name */
  async promoteDraft(name) {
    ensureDirectories();
    const destination = new File(entries, name);
    if (destination.exists) return destination.uri;

    const source = new File(drafts, name);
    if (!source.exists) throw new Error('The pending meal photo is no longer available.');
    await source.move(destination);
    return destination.uri;
  },

  /** @param {string} name */
  entryUri: (name) => new File(entries, name).uri,

  /** @param {string} name */
  async entryExists(name) {
    ensureDirectories();
    return new File(entries, name).exists;
  },

  /** @param {string} name */
  async deleteDraft(name) {
    const file = new File(drafts, name);
    if (file.exists) file.delete();
  },

  /** @param {string} name */
  async deleteEntry(name) {
    const file = new File(entries, name);
    if (file.exists) file.delete();
  },
};

export const foodPhotoStore = createFoodPhotoStore({ storage: AsyncStorage, files, environment: apiBaseUrl ?? 'unconfigured' });
