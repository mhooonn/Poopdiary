import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/**
 * @typedef {Object} ChoiceProps
 * @property {string} label
 * @property {string} [description]
 * @property {boolean} [selected]
 * @property {() => void} onPress
 * @property {'radio' | 'checkbox'} [selectionRole]
 * @property {'default' | 'danger' | 'mild' | 'moderate' | 'severe'} [tone]
 * @property {boolean} [disabled]
 * @property {'compact' | 'regular'} [density]
 * @property {'row' | 'tile'} [layout]
 * @property {import('react').ReactNode} [icon]
 * @property {string} [badge]
 * @property {import('react-native').StyleProp<import('react-native').ViewStyle>} [style]
 * @property {string} [testID]
 */

/** @param {ChoiceProps} props */
export function Choice({
  label,
  description,
  selected = false,
  onPress,
  selectionRole = 'radio',
  tone = 'default',
  disabled = false,
  density = 'regular',
  layout = 'row',
  icon,
  badge,
  style,
  testID,
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const toneColors = tone === 'danger'
    ? theme.colors.feedback.danger
    : tone === 'default'
      ? undefined
      : theme.colors.severity[tone];
  const foreground = disabled
    ? theme.colors.text.disabled
    : toneColors?.fg ?? theme.colors.text.primary;
  const selectedBackground = toneColors?.bg ?? theme.colors.surface.subtle;
  const descriptionColor = disabled
    ? theme.colors.text.disabled
    : toneColors
      ? foreground
      : theme.colors.text.secondary;
  const tile = layout === 'tile';
  const padding = density === 'compact' ? theme.spacing.sm : theme.spacing.md;

  // Decorative drawing stays fixed when the user increases native text size.
  const indicator = <View
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    aria-hidden
    style={{ width: theme.controls.icon, height: theme.controls.icon, flexShrink: 0, alignItems: 'center', justifyContent: 'center', opacity: selected ? 1 : 0 }}
  >
    <View style={{ width: theme.controls.smallIcon / 2, height: theme.controls.smallIcon * 0.75, borderRightWidth: theme.controls.selectedBorderWidth, borderBottomWidth: theme.controls.selectedBorderWidth, borderColor: foreground, transform: [{ rotate: '45deg' }] }} />
  </View>;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={selectionRole}
      accessibilityLabel={badge ? `${badge} ${label}` : label}
      accessibilityHint={description}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          minHeight: tile
            ? theme.controls.choiceTileHeight
            : theme.controls.minimumTouchTarget,
          padding,
          borderRadius: theme.radius.md,
          borderWidth: theme.controls.borderWidth,
          borderColor: selected ? foreground : theme.colors.border.control,
          outlineColor: theme.colors.focus,
          outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
          outlineOffset: theme.spacing.xs,
          backgroundColor: selected || pressed
            ? selectedBackground
            : theme.colors.surface.card,
          flexDirection: tile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: tile ? 'center' : undefined,
          position: 'relative',
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {tile && <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.xs }}>
        <AppText variant="caption" style={{ color: selected ? foreground : theme.colors.text.secondary }}>{badge}</AppText>
        {indicator}
      </View>}
      {icon !== undefined && icon !== null && (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          {icon}
        </View>
      )}
      <View
        style={{
          flex: tile ? undefined : 1,
          width: tile ? '100%' : undefined,
          minWidth: 0,
          gap: theme.spacing.xs,
          alignItems: tile ? 'center' : undefined,
        }}
      >
        <AppText
          variant="label"
          style={{ color: foreground, textAlign: tile ? 'center' : 'left' }}
        >
          {label}
        </AppText>
        {Boolean(description) && (
          <AppText
            variant="caption"
            style={{ color: descriptionColor, textAlign: tile ? 'center' : 'left' }}
          >
            {description}
          </AppText>
        )}
      </View>
      {/* The slot exists in every state; selection cannot rewrap the label. */}
      {!tile && indicator}
    </Pressable>
  );
}
