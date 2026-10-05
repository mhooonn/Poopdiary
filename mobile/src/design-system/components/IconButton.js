import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

/**
 * @param {{label: string, icon: import('lucide-react-native').LucideIcon,
 *   onPress: () => void, disabled?: boolean, testID?: string}} props
 */
export function IconButton({ label, icon: Icon, onPress, disabled = false, testID }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={({ pressed }) => ({
      minWidth: theme.controls.minimumTouchTarget,
      minHeight: theme.controls.minimumTouchTarget,
      borderRadius: theme.radius.sm,
      borderWidth: theme.controls.borderWidth,
      borderColor: 'transparent',
      outlineColor: theme.colors.focus,
      outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
      outlineOffset: theme.spacing.xs,
      backgroundColor: pressed || disabled ? theme.colors.surface.subtle : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    })}
  >
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon size={theme.controls.icon} color={disabled ? theme.colors.text.disabled : theme.colors.text.primary} />
    </View>
  </Pressable>;
}
