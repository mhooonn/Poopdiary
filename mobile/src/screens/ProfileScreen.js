import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Code2 } from 'lucide-react-native';

import { AppText, Screen, useAppearance, useTheme } from '../design-system';
import { ReminderSettings } from '../features/reminders/ReminderSettings';

const APPEARANCES = /** @type {const} */ ([
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]);

export function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { appearance, setAppearance } = useAppearance();
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [focusedAppearance, setFocusedAppearance] = useState(/** @type {'light'|'dark'|'system'|null} */ (null));
  const [appearanceError, setAppearanceError] = useState('');
  const appearanceWrite = useRef(false);

  /** @param {'light'|'dark'|'system'} value */
  async function chooseAppearance(value) {
    if (appearanceWrite.current || value === appearance) return;
    // Keep the segmented control stable while the preference is being written.
    appearanceWrite.current = true;
    setSavingAppearance(true);
    setAppearanceError('');
    try {
      await setAppearance(value);
    } catch {
      setAppearanceError("Couldn't save. Try again.");
    } finally {
      appearanceWrite.current = false;
      setSavingAppearance(false);
    }
  }

  return <Screen title="Profile" testID="profile-screen">
    <View testID="appearance-settings" style={{ gap: theme.spacing.sm }}>
      <AppText variant="sectionTitle" accessibilityRole="header">Appearance</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{
        flexDirection: 'row',
        padding: theme.spacing.xs,
        borderWidth: theme.controls.borderWidth,
        borderColor: theme.colors.border.default,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface.card,
      }}>
        {APPEARANCES.map(({ value, label }) => {
          const selected = appearance === value;
          return <Pressable
            key={value}
            testID={`appearance-${value}`}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected, disabled: savingAppearance }}
            aria-checked={selected}
            aria-disabled={savingAppearance}
            disabled={savingAppearance}
            onPress={() => void chooseAppearance(value)}
            onFocus={() => setFocusedAppearance(value)}
            onBlur={() => setFocusedAppearance((current) => current === value ? null : current)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: theme.controls.minimumTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: theme.controls.borderWidth,
              borderColor: selected ? theme.colors.border.selected : 'transparent',
              borderRadius: theme.radius.sm,
              outlineColor: theme.colors.focus,
              outlineWidth: focusedAppearance === value ? theme.controls.selectedBorderWidth : 0,
              outlineOffset: theme.spacing.xs,
              backgroundColor: selected || pressed ? theme.colors.surface.subtle : 'transparent',
            })}
          >
            <AppText variant="label" numberOfLines={1} style={{ color: selected ? theme.colors.text.primary : theme.colors.text.secondary }}>
              {label}
            </AppText>
          </Pressable>;
        })}
      </View>
      <View testID="appearance-error-slot" style={{ height: theme.typography.caption.lineHeight, justifyContent: 'center' }}>
        <AppText variant="caption" tone={appearanceError ? 'danger' : 'secondary'} numberOfLines={1} accessibilityLiveRegion="polite">
          {appearanceError}
        </AppText>
      </View>
    </View>

    <ReminderSettings />

    <View style={{ borderTopWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }}>
      <Pressable
        testID="open-dev"
        accessibilityRole="button"
        accessibilityLabel="Developer tools"
        onPress={() => router.push('/dev')}
        style={({ pressed }) => ({
          minHeight: theme.controls.minimumTouchTarget,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          backgroundColor: pressed ? theme.colors.surface.subtle : 'transparent',
        })}
      >
        <Code2 size={theme.controls.icon} color={theme.colors.text.secondary} />
        <AppText variant="label" style={{ flex: 1, color: theme.colors.text.secondary }}>Developer tools</AppText>
        <ChevronRight size={theme.controls.icon} color={theme.colors.text.secondary} />
      </Pressable>
    </View>
  </Screen>;
}
