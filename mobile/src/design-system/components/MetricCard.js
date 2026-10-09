import { View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../ThemeProvider';

/** @param {{label:string,value:string|number,unit?:string,icon:import('react').ReactNode,tone?:'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep',testID?:string}} props */
export function MetricCard({ label, value, unit = '', icon, tone = 'food', testID }) {
  const theme = useTheme();
  const color = theme.colors.entry[tone];
  return <View testID={testID} style={{ flex: 1, minWidth: 0, minHeight: theme.controls.metricMinHeight, padding: theme.spacing.sm,
    gap: theme.spacing.sm, borderRadius: theme.radius.lg, borderWidth: theme.controls.borderWidth,
    borderColor: theme.colors.border.default, backgroundColor: theme.colors.surface.card }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={{ width: theme.controls.metricIconBadge, height: theme.controls.metricIconBadge, flexShrink: 0, borderRadius: theme.radius.sm,
          alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>{icon}</View>
      <AppText variant="caption" tone="secondary" style={{ minWidth: 0, flex: 1 }}>{label}</AppText>
    </View>
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="sectionTitle" style={{ color: color.fg, fontVariant: ['tabular-nums'] }}>{value}</AppText>
      {unit !== '' && <AppText variant="caption" tone="secondary">{unit}</AppText>}
    </View>
  </View>;
}
