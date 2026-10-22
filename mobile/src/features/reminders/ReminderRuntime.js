import { useEffect } from 'react';
import { isRunningInExpoGo } from 'expo';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { subscribeRecordChanges } from '../../data/api/client';
import { addReminderRuntimeListeners, clearPresentedNotifications, dismissNotification, syncSavedReminderSchedule } from './service';

function refreshSchedule() {
  void syncSavedReminderSchedule().catch(() => undefined);
}

export function ReminderRuntime() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web' || isRunningInExpoGo()) return undefined;

    /** @type {Set<string>} */
    const handledResponses = new Set();
    /** @param {import('expo-notifications').NotificationResponse} response */
    const openToday = (response) => {
      const notification = response.notification;
      const action = notification.request.content.data?.action;
      if (action !== 'open-today') return;
      const identifier = notification.request.identifier;
      if (handledResponses.has(identifier)) return;
      handledResponses.add(identifier);
      void dismissNotification(identifier).catch(() => undefined);
      router.replace('/');
      refreshSchedule();
    };

    let active = true;
    let removeNotificationListeners = () => {};
    void addReminderRuntimeListeners((response) => {
      if (active) openToday(response);
    }).then((removeListeners) => {
      if (active) removeNotificationListeners = removeListeners;
      else removeListeners();
    }).catch(() => undefined);
    const unsubscribeRecords = subscribeRecordChanges(() => {
      refreshSchedule();
    });
    let previousState = AppState.currentState;
    const stateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active') {
        void clearPresentedNotifications().catch(() => undefined);
        refreshSchedule();
      }
      previousState = nextState;
    });

    refreshSchedule();

    return () => {
      active = false;
      removeNotificationListeners();
      stateSubscription.remove();
      unsubscribeRecords();
    };
  }, [router]);

  return null;
}
