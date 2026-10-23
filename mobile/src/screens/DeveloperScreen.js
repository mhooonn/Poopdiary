import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { Bell, Check, KeyRound, Radio, Trash2 } from 'lucide-react-native';

import { apiBaseUrl } from '../config/api';
import { ApiError, getHealth, listBowel, listDrinks, listFood } from '../data/api';
import { AppText, Button, Card, Screen, useTheme } from '../design-system';
import { getNotificationDiagnostics, requestNotificationAccess, scheduleTestNotification } from '../features/reminders/service';
import { DEFAULT_AI_ENDPOINT, DEFAULT_AI_MODEL } from '../features/insights/aiModel';
import { listAiModels } from '../features/insights/aiClient';
import { clearAiSettings, getAiSettings, saveAiSettings } from '../features/insights/aiStorage';

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
  const [aiEndpoint, setAiEndpoint] = useState(DEFAULT_AI_ENDPOINT);
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_AI_MODEL);
  const [aiModels, setAiModels] = useState(/** @type {string[]} */ ([]));
  const [aiStatus, setAiStatus] = useState('Not configured');
  const [savingAi, setSavingAi] = useState(false);
  const [testingAi, setTestingAi] = useState(false);

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

  useEffect(() => {
    let active = true;
    void getAiSettings().then((settings) => {
      if (!active) return;
      setAiEndpoint(settings.endpoint);
      setAiKey(settings.apiKey);
      setAiModel(settings.model);
      setAiStatus(settings.apiKey ? `Ready · ${settings.model}` : 'Add a key to enable AI reports');
    }).catch(() => { if (active) setAiStatus('Could not load local AI settings.'); });
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

  async function saveAiConfiguration() {
    setSavingAi(true);
    try {
      const settings = await saveAiSettings({ endpoint: aiEndpoint, apiKey: aiKey, model: aiModel });
      setAiEndpoint(settings.endpoint);
      setAiModel(settings.model);
      setAiStatus(settings.apiKey ? `Saved locally · ${settings.model}` : 'Saved without a key');
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setSavingAi(false);
    }
  }

  async function testAiConfiguration() {
    setTestingAi(true);
    setAiStatus('Checking AI service…');
    try {
      const models = await listAiModels({ endpoint: aiEndpoint, apiKey: aiKey, model: aiModel });
      setAiModels(models);
      const found = models.includes(aiModel);
      setAiStatus(`Connected · ${models.length} models available${found ? '' : ` · ${aiModel} was not listed`}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not connect to the AI service.';
      setAiStatus(Platform.OS === 'web' && message.startsWith('Could not reach the AI service')
        ? 'This provider blocks browser requests (CORS). Test AI reports in the native app.'
        : message);
    } finally {
      setTestingAi(false);
    }
  }

  async function removeAiConfiguration() {
    await clearAiSettings();
    setAiEndpoint(DEFAULT_AI_ENDPOINT);
    setAiKey('');
    setAiModel(DEFAULT_AI_MODEL);
    setAiModels([]);
    setAiStatus('Local AI settings cleared');
  }

  return <Screen title="Developer tools" onBack={onBack} testID="developer-screen">
    <Card>
      <AppText variant="sectionTitle" accessibilityRole="header">UI components</AppText>
      <Button label="Open component preview" variant="secondary" onPress={() => router.push('/dev/components')} testID="open-components" />
    </Card>
    <Card testID="ai-configuration">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <KeyRound size={theme.controls.icon} color={theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="sectionTitle" accessibilityRole="header">AI insight settings</AppText>
          <AppText variant="caption" tone="secondary">The endpoint, model and key stay on this device. They are only used when you generate an Insights report.</AppText>
        </View>
      </View>
      <AiField label="Endpoint" value={aiEndpoint} onChange={setAiEndpoint} placeholder={DEFAULT_AI_ENDPOINT} testID="ai-endpoint" theme={theme} />
      <AiField label="Model" value={aiModel} onChange={setAiModel} placeholder={DEFAULT_AI_MODEL} testID="ai-model" theme={theme} />
      <AiField label="API key" value={aiKey} onChange={setAiKey} placeholder="Paste your key" secure testID="ai-key" theme={theme} />
      <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{aiStatus}</AppText>
      {aiModels.length > 0 && <View accessibilityRole="radiogroup" accessibilityLabel="Available AI models" style={{ borderTopWidth: theme.controls.borderWidth, borderBottomWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }}>
        {aiModels.map((model) => {
          const selected = aiModel === model;
          return <Pressable key={model} accessibilityRole="radio" accessibilityLabel={model} accessibilityState={{ checked: selected }} onPress={() => { setAiModel(model); setAiStatus('Model selected · save settings to apply'); }} style={{ minHeight: theme.controls.minimumTouchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, borderBottomWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }}>
            <Radio size={theme.controls.smallIcon} color={selected ? theme.colors.entry.symptom.fg : theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />
            <AppText variant="label" style={{ flex: 1 }}>{model}</AppText>
            <View style={{ width: theme.controls.smallIcon, height: theme.controls.smallIcon, alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={theme.controls.smallIcon} color={theme.colors.entry.symptom.fg} strokeWidth={theme.controls.iconStrokeWidth} />}</View>
          </Pressable>;
        })}
      </View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Button label="Save locally" loading={savingAi} icon={<Check size={theme.controls.icon} color={theme.colors.text.primary} />} onPress={() => void saveAiConfiguration()} testID="save-ai-settings" />
        <Button label="Test connection" variant="secondary" loading={testingAi} onPress={() => void testAiConfiguration()} testID="test-ai-connection" />
        <Button label="Clear" variant="text" icon={<Trash2 size={theme.controls.icon} color={theme.colors.text.secondary} />} onPress={() => void removeAiConfiguration()} testID="clear-ai-settings" />
      </View>
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

/** @param {{label:string,value:string,onChange:(value:string)=>void,placeholder:string,secure?:boolean,testID:string,theme:any}} props */
function AiField({ label, value, onChange, placeholder, secure = false, testID, theme }) {
  return <View style={{ gap: theme.spacing.xs }}>
    <AppText variant="label">{label}</AppText>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.control, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.card, paddingHorizontal: theme.spacing.md }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.secondary}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        testID={testID}
        style={{ flex: 1, minHeight: theme.controls.minimumTouchTarget, paddingVertical: theme.spacing.sm, paddingHorizontal: secure ? theme.spacing.sm : 0, color: theme.colors.text.primary, ...theme.typography.body }}
      />
    </View>
  </View>;
}
