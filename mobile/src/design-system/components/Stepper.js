import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/** @param {{label: string, value: number, onChange: (value:number) => void, min:number, max:number, disabled?:boolean, testID?:string}} props */
export function Stepper({ label, value, onChange, min, max, disabled = false, testID }) {
  const theme = useTheme();
  return <View style={{ gap: theme.spacing.sm }}>
    <AppText variant="label">{label}</AppText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <IconButton icon={Minus} label={`Decrease ${label.toLowerCase()}`} disabled={disabled || value <= min} onPress={() => onChange(Math.max(min, value - 1))} testID={testID ? `${testID}-decrease` : undefined} />
      <AppText variant="sectionTitle" accessibilityLiveRegion="polite" style={{ flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{String(value).padStart(2, '0')}</AppText>
      <IconButton icon={Plus} label={`Increase ${label.toLowerCase()}`} disabled={disabled || value >= max} onPress={() => onChange(Math.min(max, value + 1))} testID={testID ? `${testID}-increase` : undefined} />
    </View>
  </View>;
}
