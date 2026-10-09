import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';

/** @param {{value:number,max?:number,label?:string,tone?:'water'|'food'|'bowel'|'symptom',testID?:string}} props */
export function ProgressBar({ value, max = 100, label = 'Progress', tone = 'water', testID }) {
  const theme = useTheme();
  const color = theme.colors.entry[tone];
  const maximum = Number.isFinite(max) && max > 0 ? max : 100;
  const current = Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0;
  const progress = current / maximum;
  return <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: maximum, now: current }}
    style={{ height: theme.controls.progressHeight, width: '100%', overflow: 'hidden', borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.subtle }}>
    <View style={{ height: '100%', width: `${progress * 100}%`, borderRadius: theme.radius.pill, backgroundColor: color.fg }} />
  </View>;
}
