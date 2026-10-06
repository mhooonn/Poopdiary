import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/** @param {import('./Slider').SliderProps} props */
export function Slider({ label, value, valueLabel, onChange, min = 0, max = 10, disabled = false, testID }) {
  const theme = useTheme();
  return <View style={{ gap: theme.spacing.sm }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
      <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="label" aria-hidden accessible={false} importantForAccessibility="no" style={{ opacity: 0, textAlign: 'right' }}>Not recorded</AppText>
        <AppText variant="label" style={{ position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{valueLabel ?? `${value} / ${max}`}</AppText>
      </View>
    </View>
    <input type="range" aria-label={label} aria-valuetext={valueLabel} min={min} max={max} step={1} value={value} disabled={disabled}
      data-testid={testID} onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      style={{ width: '100%', minHeight: theme.controls.minimumTouchTarget, margin: 0, accentColor: theme.colors.entry.bowel.fg, colorScheme: theme.appearance }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant="caption" tone="secondary">{min}</AppText><AppText variant="caption" tone="secondary">{max}</AppText>
    </View>
  </View>;
}
