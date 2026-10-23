import AsyncStorage from '@react-native-async-storage/async-storage';

import { AI_CONSENT_KEY, AI_SETTINGS_KEY, normalizeAiSettings } from './aiModel';

/** @returns {Promise<ReturnType<typeof normalizeAiSettings>>} */
export async function getAiSettings() {
  const stored = await AsyncStorage.getItem(AI_SETTINGS_KEY);
  if (!stored) return normalizeAiSettings({});
  try {
    return normalizeAiSettings(JSON.parse(stored));
  } catch {
    return normalizeAiSettings({});
  }
}

/** @param {unknown} value */
export async function saveAiSettings(value) {
  const settings = normalizeAiSettings(value);
  await AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export async function clearAiSettings() {
  await AsyncStorage.removeItem(AI_SETTINGS_KEY);
}

/** @param {string} endpoint */
export async function getAiConsent(endpoint) {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(AI_CONSENT_KEY)) ?? 'null');
    return saved?.accepted === true && saved.endpoint === endpoint;
  } catch {
    return false;
  }
}

/** @param {boolean} accepted @param {string} [endpoint] */
export async function setAiConsent(accepted, endpoint = '') {
  if (accepted) await AsyncStorage.setItem(AI_CONSENT_KEY, JSON.stringify({ accepted: true, endpoint }));
  else await AsyncStorage.removeItem(AI_CONSENT_KEY);
}
