const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

async function loadService({ platform, expoGo, notifications }) {
  const [source, model] = await Promise.all([
    fs.readFile(path.join(__dirname, '../src/features/reminders/service.js'), 'utf8'),
    fs.readFile(path.join(__dirname, '../src/features/reminders/model.js'), 'utf8'),
  ]);
  const storage = moduleUrl(`
    const values = new Map();
    export default {
      async getItem(key) { return values.get(key) ?? null; },
      async setItem(key, value) { values.set(key, value); },
    };
  `);
  const expo = moduleUrl(`export const isRunningInExpoGo = () => ${expoGo};`);
  const native = moduleUrl(`export const Platform = { OS: ${JSON.stringify(platform)} }; export const Linking = {};`);
  const api = moduleUrl(`
    const unavailable = async () => { throw new Error('Unexpected API request'); };
    export { unavailable as listBowel, unavailable as listDrinks, unavailable as listExercise, unavailable as listFood };
  `);
  return import(moduleUrl(source
    .replace("from '@react-native-async-storage/async-storage'", `from '${storage}'`)
    .replace("from 'expo'", `from '${expo}'`)
    .replace("from 'react-native'", `from '${native}'`)
    .replace("from '../../data/api'", `from '${api}'`)
    .replace("from './model'", `from '${moduleUrl(model)}'`)
    .replaceAll("import('expo-notifications')", `import('${notifications}')`)));
}

for (const [name, platform, expoGo] of [['Android Expo Go', 'android', true], ['web', 'web', false]]) {
  test(`${name} can load reminders without evaluating an unavailable native module`, async () => {
    const unavailable = moduleUrl("throw new Error('Cannot find native module ExpoTopicSubscriptionModule');");
    const service = await loadService({ platform, expoGo, notifications: unavailable });
    const access = { available: false, granted: false, canAskAgain: false, channelEnabled: false };
    assert.deepEqual(await service.getNotificationAccess(), access);
    assert.deepEqual(await service.requestNotificationAccess(), access);
    assert.deepEqual(await service.getNotificationDiagnostics(), { ...access, pending: 0 });

    const settings = await service.getReminderSettings();
    await service.saveReminderSettings({ ...settings, enabled: true });
    assert.deepEqual(await service.syncSavedReminderSchedule(), { available: false, scheduled: 0, reason: 'platform' });
    assert.deepEqual(await service.syncReminderSettings(settings), { available: false, scheduled: 0, reason: 'platform' });

    const remove = await service.addReminderRuntimeListeners(() => assert.fail('Unexpected notification response'));
    remove();
    await service.clearPresentedNotifications();
    await service.dismissNotification('old-reminder');
    await service.cancelTestNotification('test-reminder');
    await assert.rejects(service.scheduleTestNotification(), /development build/);
  });
}

test('native reminders clear handled responses and stop delivering them after listener cleanup', async () => {
  const notifications = moduleUrl(`
    export const state = {
      responseListeners: new Set(), receivedListeners: new Set(), clears: 0, handler: null,
      resolveLastResponse: null,
    };
    export const AndroidImportance = { NONE: 0 };
    export function setNotificationHandler(handler) { state.handler = handler; }
    export async function getPermissionsAsync() { return { granted: true, canAskAgain: true }; }
    export async function getNotificationChannelAsync() { return null; }
    export function addNotificationResponseReceivedListener(listener) {
      state.responseListeners.add(listener);
      return { remove() { state.responseListeners.delete(listener); } };
    }
    export function addNotificationReceivedListener(listener) {
      state.receivedListeners.add(listener);
      return { remove() { state.receivedListeners.delete(listener); } };
    }
    export function getLastNotificationResponseAsync() {
      return new Promise((resolve) => { state.resolveLastResponse = resolve; });
    }
    export async function clearLastNotificationResponseAsync() { state.clears += 1; }
  `);
  const { state } = await import(notifications);
  const service = await loadService({ platform: 'android', expoGo: false, notifications });
  assert.deepEqual(await service.getNotificationAccess(), {
    available: true, granted: true, canAskAgain: true, channelEnabled: true,
  });

  const received = [];
  const remove = await service.addReminderRuntimeListeners((response) => received.push(response));
  assert.equal(state.responseListeners.size, 1);
  assert.equal(state.receivedListeners.size, 1);
  const [deliverResponse] = state.responseListeners;
  const response = { notification: { request: { identifier: 'reminder', content: { data: { action: 'open-today' } } } } };

  state.resolveLastResponse(response);
  await new Promise(setImmediate);
  assert.deepEqual(received, [response]);
  assert.equal(state.clears, 1);
  deliverResponse({ notification: { request: { content: { data: { action: 'another-feature' } } } } });
  assert.equal(received.length, 1);
  assert.equal(state.clears, 1);

  remove();
  assert.equal(state.responseListeners.size, 0);
  assert.equal(state.receivedListeners.size, 0);
  deliverResponse(response);
  assert.equal(received.length, 1);

  const removeBeforeResponse = await service.addReminderRuntimeListeners((next) => received.push(next));
  removeBeforeResponse();
  state.resolveLastResponse(response);
  await new Promise(setImmediate);
  assert.equal(received.length, 1);
  assert.equal(state.clears, 1);
});
