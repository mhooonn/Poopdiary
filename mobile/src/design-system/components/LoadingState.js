import { ActivityIndicator, View } from 'react-native';
import { AppText } from './AppText';
import { useReducedMotion, useTheme } from '../ThemeProvider';

/** @param {{label?:string,testID?:string}} props */
export function LoadingState({ label = 'Loading', testID } = {}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  return <View testID={testID} accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite"
    style={{ minHeight: theme.controls.minimumTouchTarget * 2, gap: theme.spacing.sm, justifyContent: 'center', alignItems: 'center' }}>
    {!reducedMotion && <ActivityIndicator color={theme.colors.text.primary} />}
    <AppText variant="caption" tone="secondary">{label}</AppText>
  </View>;
}
