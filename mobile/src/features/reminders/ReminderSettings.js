import { useCallback, useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ChevronRight, Settings } from 'lucide-react-native';

import { AppText, Button, Card, Choice, Sheet, TimeInput, useTheme } from '../../design-system';
import { DEFAULT_REMINDER_SETTINGS, REMINDER_WEEKDAYS } from './model';
/** @typedef {import('./model').ReminderSettings} ReminderSettings */
/** @typedef {import('./model').ReminderAccess} ReminderAccess */
import {
  getNotificationAccess,
  getReminderSettings,
  openNotificationSettings,
  requestNotificationAccess,
  saveReminderSettings,
  syncReminderSettings,
} from './service';

/** @typedef {'every-day'|'weekdays'|'weekends'|'custom'} RepeatMode */

/** @param {number[]} weekdays @returns {RepeatMode} */
function repeatMode(weekdays) {
  if (weekdays.length === 7) return 'every-day';
  if (weekdays.length === 5 && [1, 2, 3, 4, 5].every((day) => weekdays.includes(day))) return 'weekdays';
  if (weekdays.length === 2 && [0, 6].every((day) => weekdays.includes(day))) return 'weekends';
  return 'custom';
}

/** @type {{value:RepeatMode,label:string,weekdays:number[]|null}[]} */
const REPEAT_PRESETS = [
  { value: 'every-day', label: 'Every day', weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { value: 'weekdays', label: 'Weekdays', weekdays: [1, 2, 3, 4, 5] },
  { value: 'weekends', label: 'Weekends', weekdays: [0, 6] },
  { value: 'custom', label: 'Custom days', weekdays: null },
];

export function ReminderSettings() {
  const theme = useTheme();
  const [settings, setSettings] = useState(/** @type {ReminderSettings} */ ({
    ...DEFAULT_REMINDER_SETTINGS,
    weekdays: [...DEFAULT_REMINDER_SETTINGS.weekdays],
  }));
  const [access, setAccess] = useState(/** @type {ReminderAccess | null} */ (null));
  const [scheduleState, setScheduleState] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingTime, setPendingTime] = useState(/** @type {string} */ (DEFAULT_REMINDER_SETTINGS.time));
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [pendingRepeatMode, setPendingRepeatMode] = useState(/** @type {RepeatMode} */ ('every-day'));
  const [pendingWeekdays, setPendingWeekdays] = useState([...DEFAULT_REMINDER_SETTINGS.weekdays]);

  const refresh = useCallback(async () => {
    try {
      const next = await getReminderSettings();
      setSettings(next);
      setAccess(await getNotificationAccess());
      if (next.enabled) {
        const result = await syncReminderSettings(next);
        setScheduleState(result.reason);
      }
    } catch {
      setError('Could not load reminder settings.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  /** @param {ReminderSettings} next */
  async function persist(next) {
    setError('');
    try {
      const saved = await saveReminderSettings(next);
      setSettings(saved);
      const result = await syncReminderSettings(saved);
      setScheduleState(result.reason);
      setAccess(await getNotificationAccess());
      return true;
    } catch {
      setError('Could not update the reminder. Try again.');
      return false;
    }
  }

  /** @param {boolean} enabled */
  async function toggleEnabled(enabled) {
    setError('');
    if (!enabled) {
      await persist({ ...settings, enabled: false });
      return;
    }
    if (Platform.OS === 'web') return;
    setBusy(true);
    try {
      const nextAccess = await requestNotificationAccess();
      setAccess(nextAccess);
      if (!nextAccess.granted || !nextAccess.channelEnabled) {
        setScheduleState('permission');
        return;
      }
      await persist({ ...settings, enabled: true });
    } catch {
      setError('Notifications could not be enabled. Check system settings.');
    } finally {
      setBusy(false);
    }
  }

  async function applyTime() {
    const saved = await persist({ ...settings, time: pendingTime });
    if (saved) setShowTimePicker(false);
  }

  function openTimePicker() {
    setPendingTime(settings.time);
    setShowTimePicker(true);
  }

  function openRepeatPicker() {
    setPendingWeekdays([...settings.weekdays]);
    setPendingRepeatMode(repeatMode(settings.weekdays));
    setShowRepeatPicker(true);
  }

  /** @param {RepeatMode} value */
  function selectRepeatPreset(value) {
    setPendingRepeatMode(value);
    const preset = REPEAT_PRESETS.find((item) => item.value === value);
    if (preset?.weekdays) setPendingWeekdays(preset.weekdays);
  }

  /** @param {number} day */
  function togglePendingWeekday(day) {
    setPendingWeekdays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day]);
  }

  async function applyRepeat() {
    if (pendingWeekdays.length === 0) return;
    const saved = await persist({ ...settings, weekdays: pendingWeekdays });
    if (saved) setShowRepeatPicker(false);
  }

  const blockedBySystem = access?.granted && !access.channelEnabled;
  const blockedByPermission = settings.enabled && access && !access.granted;
  const permissionPermanentlyDenied = access !== null && !access.granted && !access.canAskAgain;
  const showSystemSettings = Platform.OS !== 'web' && (blockedBySystem || permissionPermanentlyDenied);

  return <Card testID="reminder-settings" style={{ gap: theme.spacing.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
        <AppText variant="sectionTitle">Daily reminder</AppText>
        <AppText variant="caption" tone="secondary">A quiet prompt. No diary details in the notification.</AppText>
      </View>
      <Switch accessibilityLabel="Enable logging reminder" value={settings.enabled}
        disabled={busy || Platform.OS === 'web'} onValueChange={toggleEnabled}
        trackColor={{ false: theme.colors.border.control, true: theme.colors.action.primary.background }}
        thumbColor={theme.colors.surface.card} />
    </View>

    {Platform.OS === 'web' && <AppText tone="secondary">Enable reminders on an iOS or Android device.</AppText>}

    {settings.enabled && <>
      <View style={{ height: theme.controls.borderWidth, backgroundColor: theme.colors.border.default }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Reminder time, ${settings.time}`}
        onPress={openTimePicker} disabled={busy} testID="reminder-time"
        style={({ pressed }) => ({ minHeight: theme.controls.minimumTouchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xs, borderRadius: theme.radius.sm, backgroundColor: pressed ? theme.colors.surface.subtle : 'transparent' })}>
        <AppText variant="label" style={{ flex: 1 }}>Time</AppText>
        <AppText variant="sectionTitle" style={{ color: theme.colors.action.primary.background, fontVariant: ['tabular-nums'] }}>{settings.time}</AppText>
        <ChevronRight size={theme.controls.icon} color={theme.colors.text.secondary} />
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel={`Repeat, ${REPEAT_PRESETS.find((item) => item.value === repeatMode(settings.weekdays))?.label ?? 'Custom days'}`}
        onPress={openRepeatPicker} disabled={busy} testID="reminder-repeat"
        style={({ pressed }) => ({ minHeight: theme.controls.minimumTouchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xs, borderRadius: theme.radius.sm, backgroundColor: pressed ? theme.colors.surface.subtle : 'transparent' })}>
        <AppText variant="label" style={{ flex: 1 }}>Repeat</AppText>
        <AppText variant="body" style={{ color: theme.colors.text.secondary }}>{REPEAT_PRESETS.find((item) => item.value === repeatMode(settings.weekdays))?.label ?? 'Custom days'}</AppText>
        <ChevronRight size={theme.controls.icon} color={theme.colors.text.secondary} />
      </Pressable>
    </>}

    {blockedByPermission && <AppText style={{ color: theme.colors.feedback.warning.fg }}>Notifications are off in system settings.</AppText>}
    {blockedBySystem && <AppText style={{ color: theme.colors.feedback.warning.fg }}>This reminder is turned off in system settings.</AppText>}
    {settings.enabled && scheduleState === 'data' && <AppText style={{ color: theme.colors.feedback.warning.fg }}>Reminders are paused while entries cannot be loaded.</AppText>}
    {scheduleState === 'permission' && !settings.enabled && <AppText style={{ color: theme.colors.feedback.warning.fg }}>Allow notifications to turn on this reminder.</AppText>}
    {error !== '' && <AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText>}
    {showSystemSettings && <Button label="Open notification settings" variant="secondary"
      icon={<Settings size={theme.controls.icon} color={theme.colors.text.primary} />}
      onPress={() => void openNotificationSettings()} />}

    <Sheet visible={showTimePicker} title="Reminder time" onClose={() => setShowTimePicker(false)}>
      <TimeInput label="Time" value={pendingTime} onChange={setPendingTime} testID="reminder-time-input" />
      <Button label="Save time" onPress={() => void applyTime()} testID="reminder-time-apply" />
    </Sheet>
    <Sheet visible={showRepeatPicker} title="Repeat" onClose={() => setShowRepeatPicker(false)}>
      {REPEAT_PRESETS.map((preset) => <Choice key={preset.value} label={preset.label} selected={pendingRepeatMode === preset.value}
        onPress={() => selectRepeatPreset(preset.value)} testID={`repeat-preset-${preset.value}`} />)}
      {pendingRepeatMode === 'custom' && <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm }}>
        <AppText variant="label">Choose days</AppText>
        {REMINDER_WEEKDAYS.map((day) => <Choice key={day.value} label={day.label} selectionRole="checkbox"
          selected={pendingWeekdays.includes(day.value)} onPress={() => togglePendingWeekday(day.value)} testID={`repeat-day-${day.value}`} />)}
      </View>}
      {error !== '' && <AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText>}
      <Button label="Save schedule" onPress={() => void applyRepeat()} disabled={pendingWeekdays.length === 0}
        testID="repeat-apply" />
    </Sheet>
  </Card>;
}
