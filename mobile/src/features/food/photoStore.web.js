// Photos are supported in native builds, where the index is backed by app-local files.
/** @param {string} _uri @param {number} _width @param {number} _height */
async function saveDraft(_uri, _width, _height) {
  throw new Error('Meal photos are only available in the mobile app.');
}

/** @param {string} _name */
function draftUri(_name) {
  throw new Error('Meal photos are only available in the mobile app.');
}

/** @param {number} _foodId */
async function getPhotoUri(_foodId) {
  return null;
}

/** @param {number} _foodId @param {string} _name */
async function attachDraft(_foodId, _name) {
  throw new Error('Meal photos are only available in the mobile app.');
}

/** @param {string} _name */
async function discardDraft(_name) {}

/** @param {number} _foodId */
async function removePhoto(_foodId) {}

export const foodPhotoStore = { saveDraft, draftUri, getPhotoUri, attachDraft, discardDraft, removePhoto };
