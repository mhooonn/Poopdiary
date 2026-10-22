import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { apiBaseUrl } from '../config/api';
import { ApiError, getHealth, listBowel, listDrinks, listFood } from '../data/api';
import { AppText, Button, Card, Screen, useTheme } from '../design-system';
import { getNotificationDiagnostics, requestNotificationAccess, scheduleTestNotification } from '../features/reminders/service';

/** @typedef {{label:string,path:string,kind:'success'|'error',message?:string,count?:number}} EndpointCheck */
/** @typedef {{kind:'idle'|'loading'|'success'|'error',message:string,checks?:EndpointCheck[]}} ConnectionState */

/** @param {{onBack?: () => void}} props */
export function DeveloperScreen({ onBack }) {
  const theme = useTheme();
  const router = useRouter();
  const activeRequest = useRef(/** @type {AbortController | null} */ (null));
  const [connection, setConnection] = useState(/** @type {ConnectionState} */ ({ kind: 'idle', message: 'Not checked' }));
  const [reminderStatus, setReminderStatus] = useState('Checking notification status…');
  const [testingReminder, setTestingReminder] = useState(false);

  useEffect(() => () => activeRequest.current?.abort(), []);

  useEffect(() => {
    let active = true;
    void getNotificationDiagnostics().then((status) => {
      if (!active) return;
      setReminderStatus(!status.available
        ? (isRunningInExpoGo() ? 'Use the app development build to test local notifications.' : 'Use an iOS or Android device to test local notifications.')
        : `${status.granted && status.channelEnabled ? 'Allowed' : 'Not allowed'} · ${status.pending} pending`);
    }).catch(() => { if (active) setReminderStatus('Could not read notification status.'); });
    return () => { active = false; };
  }, []);

  async function sendReminderTest() {
    setTestingReminder(true);
    try {
      const access = await requestNotificationAccess();
      if (!access.granted || !access.channelEnabled) {
        setReminderStatus('Allow notifications to run the test.');
        return;
      }
      await scheduleTestNotification();
      setReminderStatus('Test notification scheduled for 5 seconds.');
    } catch {
      setReminderStatus('Could not schedule a test notification.');
    } finally {
      setTestingReminder(false);
    }
  }

  async function checkConnection() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setConnection({ kind: 'loading', message: 'Checking API…' });

    try {
      /** @type {{label:string,path:string,run:()=>Promise<{message?:string,count?:number}>}[]} */
      const requests = [
        { label: 'Health', path: '/api/health', run: () => getHealth({ signal: controller.signal }).then(({ message }) => ({ message })) },
        { label: 'Bowel', path: '/api/bowel', run: () => listBowel({ signal: controller.signal }).then((records) => ({ count: records.length })) },
        { label: 'Food', path: '/api/food', run: () => listFood({ signal: controller.signal }).then((records) => ({ count: records.length })) },
        { label: 'Drinks', path: '/api/drinks', run: () => listDrinks({ signal: controller.signal }).then((records) => ({ count: records.length })) },
      ];
      const results = await Promise.allSettled(requests.map((request) => request.run()));
      if (controller.signal.aborted) return;
      /** @type {EndpointCheck[]} */
      const checks = results.map((result, index) => {
        const { label, path } = requests[index];
        return result.status === 'fulfilled'
          ? { label, path, kind: 'success', ...result.value }
          : { label, path, kind: 'error', message: result.reason instanceof ApiError ? result.reason.message : 'Could not check this endpoint.' };
      });
      const failed = checks.some((check) => check.kind === 'error');
      setConnection({ kind: failed ? 'error' : 'success', message: failed ? 'Some API requests failed.' : 'All endpoints are available.', checks });
    } catch (error) {
      if (controller.signal.aborted) return;
      controller.abort();
      setConnection({ kind: 'error', message: error instanceof ApiError ? error.message : 'Could not check the API.' });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return <Screen title="Developer tools" onBack={onBack} testID="developer-screen">
    <Card>
      <AppText variant="sectionTitle" accessibilityRole="header">UI components</AppText>
      <Button label="Open component preview" variant="secondary" onPress={() => router.push('/dev/components')} testID="open-components" />
    </Card>
    <Card testID="reminder-diagnostics">
      <AppText variant="sectionTitle" accessibilityRole="header">Local notifications</AppText>
      <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{reminderStatus}</AppText>
      <Button label="Send test notification" variant="secondary" icon={<Bell size={theme.controls.icon} color={theme.colors.text.primary} />}
        loading={testingReminder} disabled={Platform.OS === 'web' || isRunningInExpoGo()}
        onPress={() => void sendReminderTest()} testID="send-notification-test" />
    </Card>
    <Card>
      <AppText variant="sectionTitle" accessibilityRole="header">API connection</AppText>
      <AppText variant="caption" tone="secondary">{apiBaseUrl?.trim() || 'EXPO_PUBLIC_API_URL is not set'}</AppText>
      <Button label="Test connection" loading={connection.kind === 'loading'} onPress={checkConnection} testID="test-api" />
      <View accessibilityLiveRegion="polite" role="status" testID="api-status" style={{ gap: theme.spacing.sm }}>
        <AppText tone={connection.kind === 'error' ? 'danger' : 'secondary'}>{connection.message}</AppText>
        {connection.checks?.map((check) => <View key={check.path} testID={`api-check-${check.label.toLowerCase()}`} style={{ gap: theme.spacing.xs }}>
          <AppText variant="label" tone={check.kind === 'error' ? 'danger' : 'primary'}>{check.label}{check.count === undefined ? '' : `: ${check.count} entries`}</AppText>
          <AppText variant="caption" tone="secondary">{check.path}</AppText>
          {check.message && <AppText variant="caption" tone={check.kind === 'error' ? 'danger' : 'secondary'}>{check.message}</AppText>}
        </View>)}
      </View>
    </Card>
  </Screen>;
}
