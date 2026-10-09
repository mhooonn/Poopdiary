import { View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../ThemeProvider';

/** @param {{title:string,message?:string,actionLabel?:string,onAction?:()=>void,testID?:string}} props */
export function EmptyState({ title, message, actionLabel, onAction, testID }) {
  const theme = useTheme();
  return <View testID={testID} style={{ minHeight: theme.controls.minimumTouchTarget * 2, paddingVertical: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center' }}>
    <AppText variant="label" tone="secondary" style={{ textAlign: 'center' }}>{title}</AppText>
    {message && <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>{message}</AppText>}
    {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} />}
  </View>;
}
