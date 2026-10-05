import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { apiBaseUrl } from '../config/api';
import { ApiError, getDiary, getHealth } from '../data/api';
import { AppText, Button, Card, Screen, useTheme } from '../design-system';

/** @typedef {{kind: 'idle' | 'loading' | 'success' | 'error', message: string, count?: number, date?: string}} ConnectionState */

/** @param {{onBack?: () => void}} props */
export function DeveloperScreen({ onBack }) {
  const theme = useTheme();
  const router = useRouter();
  const activeRequest = useRef(/** @type {AbortController | null} */ (null));
  const [connection, setConnection] = useState(/** @type {ConnectionState} */ ({ kind: 'idle', message: 'Not checked' }));

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function checkConnection() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setConnection({ kind: 'loading', message: 'Checking API…' });

    try {
      const [health, diary] = await Promise.all([
        getHealth({ signal: controller.signal }),
        getDiary({ signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setConnection({ kind: 'success', message: health.message, count: diary.length, date: diary[0]?.date });
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
    <Card>
      <AppText variant="sectionTitle" accessibilityRole="header">API connection</AppText>
      <AppText variant="caption" tone="secondary">{apiBaseUrl?.trim() || 'EXPO_PUBLIC_API_URL is not set'}</AppText>
      <Button label="Test connection" loading={connection.kind === 'loading'} onPress={checkConnection} testID="test-api" />
      <View accessibilityLiveRegion="polite" role="status" testID="api-status" style={{ gap: theme.spacing.sm }}>
        <AppText tone={connection.kind === 'error' ? 'danger' : 'secondary'}>{connection.message}</AppText>
        {connection.kind === 'success' && <View style={{ gap: theme.spacing.xs }}>
          <AppText>Diary entries: {connection.count}</AppText>
          {connection.date && <AppText variant="caption" tone="secondary">First entry: {connection.date}</AppText>}
        </View>}
      </View>
    </Card>
  </Screen>;
}
