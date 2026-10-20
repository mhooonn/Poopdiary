import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { listBowel, listDrinks, listExercise, listFood } from '../../data/api';
import { DEFAULT_REMINDER_SETTINGS, localDateFromTimestamp, normalizeReminderSettings, parseReminderSettings, REMINDER_STORAGE_KEY, upcomingReminderDates } from './model';

/** @typedef {import('./model').ReminderSettings} ReminderSettings */
/** @typedef {import('./model').ReminderAccess} ReminderAccess */
/** @typedef {import('./model').ReminderScheduleResult} ReminderScheduleResult */

const CHANNEL_ID = 'daily-log-reminder';
const DAILY_KIND = 'daily-log-reminder';
const TEST_KIND = 'daily-log-reminder-test';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isTest = notification.request.content.data?.kind === TEST_KIND;
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: isTest,
        shouldShowList: isTest,
      };
    },
  });
}

/** @returns {Promise<ReminderSettings>} */
export async function getReminderSettings() {
  return parseReminderSettings(await AsyncStorage.getItem(REMINDER_STORAGE_KEY));
}

/** @param {ReminderSettings} settings @returns {Promise<ReminderSettings>} */
export async function saveReminderSettings(settings) {
  const normalized = normalizeReminderSettings(settings);
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily log reminder',
    description: 'A quiet reminder to review today.',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    sound: null,
    vibrationPattern: [],
    enableVibrate: false,
    showBadge: false,
  });
}

/** @returns {Promise<ReminderAccess>} */
export async function getNotificationAccess() {
  if (Platform.OS === 'web') {
    return { available: false, granted: false, canAskAgain: false, channelEnabled: false };
  }
  const permissions = await Notifications.getPermissionsAsync();
  const channel = Platform.OS === 'android'
    ? await Notifications.getNotificationChannelAsync(CHANNEL_ID)
    : null;
  return {
    available: true,
    granted: permissions.granted,
    canAskAgain: permissions.canAskAgain,
    channelEnabled: channel === null || channel.importance !== Notifications.AndroidImportance.NONE,
  };
}

/** @returns {Promise<ReminderAccess>} Ask only after the user enables reminders. */
export async function requestNotificationAccess() {
  if (Platform.OS === 'web') return getNotificationAccess();
  await ensureAndroidChannel();
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted && permissions.canAskAgain) {
    permissions = await Notifications.requestPermissionsAsync();
  }
  const channel = Platform.OS === 'android'
    ? await Notifications.getNotificationChannelAsync(CHANNEL_ID)
    : null;
  return {
    available: true,
    granted: permissions.granted,
    canAskAgain: permissions.canAskAgain,
    channelEnabled: channel === null || channel.importance !== Notifications.AndroidImportance.NONE,
  };
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

async function cancelDailyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((item) => item.content.data?.kind === DAILY_KIND)
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

/** @param {ReminderSettings} settings @returns {Promise<ReminderScheduleResult>} */
async function syncReminderSchedule(settings) {
  if (Platform.OS === 'web') return { available: false, scheduled: 0, reason: 'platform' };
  await cancelDailyReminders();
  if (!settings.enabled) return { available: true, scheduled: 0, reason: 'disabled' };

  await ensureAndroidChannel();
  const access = await getNotificationAccess();
  if (!access.granted || !access.channelEnabled) {
    return { available: true, scheduled: 0, reason: 'permission' };
  }

  let records;
  try {
    records = await Promise.all([listFood(), listBowel(), listDrinks(), listExercise()]);
  } catch {
    return { available: true, scheduled: 0, reason: 'data' };
  }

  /** @type {string[]} */
  const bowelDates = records[1].map((record) => localDateFromTimestamp(record.occurred_at))
    .filter((date) => date !== null);
  const recordedDates = new Set([
    ...records[0].map((record) => record.date),
    ...bowelDates,
    ...records[2].map((record) => record.local_date),
    ...records[3].map((record) => record.local_date),
  ]);
  const dates = upcomingReminderDates({
    now: new Date(),
    time: settings.time,
    weekdays: settings.weekdays,
    recordedDates,
  });

  await Promise.all(dates.map((date) => Notifications.scheduleNotificationAsync({
    content: {
      title: 'A moment for today',
      body: 'Would you like to add anything? It is okay if not.',
      data: { kind: DAILY_KIND, action: 'open-today' },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  })));

  return { available: true, scheduled: dates.length, reason: dates.length ? 'ready' : 'none' };
}

let syncQueue = Promise.resolve();

/** Serialize refreshes so foreground and record writes cannot create duplicate schedules. */
/** @returns {Promise<ReminderScheduleResult>} */
export function syncSavedReminderSchedule() {
  const current = syncQueue.catch(() => undefined).then(async () => {
    const settings = await getReminderSettings();
    return syncReminderSchedule(settings);
  });
  syncQueue = current.then(() => undefined, () => undefined);
  return current;
}

/** @param {ReminderSettings} settings @returns {Promise<ReminderScheduleResult>} */
export function syncReminderSettings(settings) {
  const normalized = normalizeReminderSettings(settings);
  const current = syncQueue.catch(() => undefined).then(() => syncReminderSchedule(normalized));
  syncQueue = current.then(() => undefined, () => undefined);
  return current;
}

export async function scheduleTestNotification() {
  if (Platform.OS === 'web') throw new Error('Use an iOS or Android device to test notifications.');
  const access = await getNotificationAccess();
  if (!access.granted || !access.channelEnabled) throw new Error('Allow notifications in system settings first.');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'A moment for today',
      body: 'This is a test notification.',
      data: { kind: TEST_KIND, action: 'open-today' },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

/** @param {string | undefined} identifier */
export async function cancelTestNotification(identifier) {
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function getNotificationDiagnostics() {
  const access = await getNotificationAccess();
  if (!access.available) return { ...access, pending: 0 };
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return {
    ...access,
    pending: scheduled.filter((item) => typeof item.content.data?.kind === 'string'
      && [DAILY_KIND, TEST_KIND].includes(item.content.data.kind)).length,
  };
}

export async function clearPresentedNotifications() {
  if (Platform.OS === 'web') return;
  const presented = await Notifications.getPresentedNotificationsAsync();
  const reminderNotifications = presented.filter((item) => {
    const kind = item.request.content.data?.kind;
    return typeof kind === 'string' && [DAILY_KIND, TEST_KIND].includes(kind);
  });
  await Promise.all(reminderNotifications.map((item) => dismissNotification(item.request.identifier)));
}

/** @param {string} identifier */
export async function dismissNotification(identifier) {
  if (Platform.OS !== 'web') await Notifications.dismissNotificationAsync(identifier);
}

export const emptyReminderSettings = () => ({
  ...DEFAULT_REMINDER_SETTINGS,
  weekdays: [...DEFAULT_REMINDER_SETTINGS.weekdays],
});
