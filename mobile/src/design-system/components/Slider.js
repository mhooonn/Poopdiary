import { View } from 'react-native';
import NativeSlider from '@react-native-community/slider';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/** @typedef {{label:string,value:number,valueLabel?:string,onChange:(value:number)=>void,min?:number,max?:number,disabled?:boolean,testID?:string}} SliderProps */
/** @param {SliderProps} props */
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
    <NativeSlider value={value} onValueChange={onChange} minimumValue={min} maximumValue={max} step={1}
      disabled={disabled} testID={testID} accessibilityLabel={label} accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value, text: valueLabel }}
      minimumTrackTintColor={theme.colors.entry.bowel.fg} maximumTrackTintColor={theme.colors.border.control}
      thumbTintColor={theme.colors.entry.bowel.fg} style={{ width: '100%', height: theme.controls.minimumTouchTarget }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant="caption" tone="secondary">{min}</AppText><AppText variant="caption" tone="secondary">{max}</AppText>
    </View>
  </View>;
}
