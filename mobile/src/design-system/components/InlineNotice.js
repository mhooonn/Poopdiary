import { View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../ThemeProvider';

/** @param {{title:string,message?:string,tone?:'warning'|'danger'|'success',actionLabel?:string,onAction?:()=>void,loading?:boolean,testID?:string}} props */
export function InlineNotice({ title, message, tone = 'danger', actionLabel, onAction, loading = false, testID }) {
  const theme = useTheme();
  const color = theme.colors.feedback[tone];
  return <View testID={testID} accessibilityRole={tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
    style={{ padding: theme.spacing.md, gap: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth, borderColor: color.fg, backgroundColor: color.bg }}>
    <AppText variant="label" style={{ color: color.fg }}>{title}</AppText>
    {message && <AppText variant="caption" style={{ color: color.fg }}>{message}</AppText>}
    {actionLabel && onAction && <Button label={actionLabel} variant="secondary" onPress={onAction} loading={loading} />}
  </View>;
}
