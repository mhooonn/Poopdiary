import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../ThemeProvider';

/** @param {{label:string, icon:import('react').ReactNode, tone?:'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep',variant?:'regular'|'compact',disabled?:boolean, onPress:()=>void, testID?:string}} props */
export function QuickLogCard({ label, icon, tone = 'food', variant = 'regular', disabled = false, onPress, testID }) {
  const theme = useTheme();
  const color = theme.colors.entry[tone];
  const [focused, setFocused] = useState(false);
  const compact = variant === 'compact';
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`Log ${label}`} accessibilityState={{ disabled }}
    onPress={onPress} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ minHeight: compact ? theme.controls.quickLogCompactMinHeight : theme.controls.quickLogMinHeight,
      flex: compact ? 1 : undefined, flexBasis: compact ? undefined : '47%', flexGrow: 1, minWidth: 0,
      padding: compact ? theme.spacing.sm : theme.spacing.md,
      gap: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: theme.controls.borderWidth,
      borderColor: theme.colors.border.default, outlineColor: theme.colors.focus,
      outlineWidth: focused ? theme.controls.selectedBorderWidth : 0, outlineOffset: theme.spacing.xs,
      backgroundColor: disabled ? theme.colors.disabled.background : pressed ? theme.colors.surface.subtle : theme.colors.surface.card })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: compact ? 'center' : 'space-between', gap: theme.spacing.sm }}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={{ width: theme.controls.quickLogIconBadge, height: theme.controls.quickLogIconBadge, borderRadius: theme.radius.md,
          alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
        {icon}
      </View>
      {!compact && <ChevronRight size={theme.controls.smallIcon} color={theme.colors.text.secondary} />}
    </View>
    <AppText variant="label" style={{ textAlign: compact ? 'center' : 'left', color: disabled ? theme.colors.disabled.foreground : theme.colors.text.primary }}>{label}</AppText>
  </Pressable>;
}
