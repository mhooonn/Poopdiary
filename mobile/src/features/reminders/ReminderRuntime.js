import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { subscribeRecordChanges } from '../../data/api/client';
import { clearPresentedNotifications, dismissNotification, syncSavedReminderSchedule } from './service';

function refreshSchedule() {
  void syncSavedReminderSchedule().catch(() => undefined);
}

export function ReminderRuntime() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    /** @type {Set<string>} */
    const handledResponses = new Set();
    /** @param {Notifications.NotificationResponse} response */
    const openToday = (response) => {
      const notification = response.notification;
      const action = notification.request.content.data?.action;
      if (action !== 'open-today') return;
      const identifier = notification.request.identifier;
      if (handledResponses.has(identifier)) return;
      handledResponses.add(identifier);
      void dismissNotification(identifier).catch(() => undefined);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      router.replace('/');
      refreshSchedule();
    };

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(openToday);
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      refreshSchedule();
    });
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

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openToday(response);
    }).catch(() => undefined);
    refreshSchedule();

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
      stateSubscription.remove();
      unsubscribeRecords();
    };
  }, [router]);

  return null;
}
