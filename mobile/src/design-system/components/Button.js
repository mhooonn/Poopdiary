import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useReducedMotion, useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/**
 * @typedef {Object} ButtonProps
 * @property {string} label
 * @property {() => void} onPress
 * @property {'primary' | 'secondary' | 'danger' | 'text'} [variant]
 * @property {boolean} [disabled]
 * @property {boolean} [loading]
 * @property {boolean} [expanded]
 * @property {import('react').ReactNode} [icon]
 * @property {string} [testID]
 */

/** @param {ButtonProps} props */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  expanded,
  icon,
  testID,
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const textOnly = variant === 'text';
  const colors = textOnly
    ? {
        background: 'transparent',
        foreground: theme.colors.text.primary,
        pressed: theme.colors.surface.subtle,
      }
    : theme.colors.action[variant];
  const foreground = inactive ? theme.colors.disabled.foreground : colors.foreground;
  const hasIcon = icon !== undefined && icon !== null;

  const indicator = reducedMotion ? (
    <View style={{ flexDirection: 'row', gap: theme.controls.borderWidth * 2 }}>
      {[0, 1, 2].map((dot) => <View key={dot} style={{ width: theme.controls.borderWidth * 3, height: theme.controls.borderWidth * 3, borderRadius: theme.radius.pill, backgroundColor: foreground }} />)}
    </View>
  ) : (
    <ActivityIndicator size="small" color={foreground} />
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: inactive,
        busy: loading,
        ...(expanded === undefined ? {} : { expanded }),
      }}
      aria-disabled={inactive}
      aria-busy={loading}
      aria-expanded={expanded}
      disabled={inactive}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        minHeight: theme.controls.minimumTouchTarget,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.md,
        borderWidth: theme.controls.borderWidth,
        borderColor: textOnly
          ? 'transparent'
          : inactive
            ? theme.colors.border.default
            : variant === 'secondary'
              ? theme.colors.border.control
              : 'transparent',
        outlineColor: theme.colors.focus,
        outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
        outlineOffset: theme.spacing.xs,
        backgroundColor: inactive && !textOnly
          ? theme.colors.disabled.background
          : pressed
            ? colors.pressed
            : colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
      })}
    >
      {hasIcon && (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={{
            width: theme.controls.icon,
            height: theme.controls.icon,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? indicator : icon}
        </View>
      )}
      {/* Keep the label mounted so loading never changes width or wrapping. */}
      <AppText
        variant="label"
        aria-hidden={loading && !hasIcon}
        style={{
          color: foreground,
          textAlign: 'center',
          flexShrink: 1,
          opacity: loading && !hasIcon ? 0 : 1,
        }}
      >
        {label}
      </AppText>
      {!hasIcon && (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading && indicator}
        </View>
      )}
    </Pressable>
  );
}
