import { Clock3 } from 'lucide-react-native';

import { Button } from './Button';
import { useTheme } from '../ThemeProvider';
import { formatDisplayDate } from '../../shared/dateTime';

/** @param {{date:string,time:string|null,onPress:()=>void,disabled?:boolean,testID?:string}} props */
export function DateTimeField({ date, time, onPress, disabled = false, testID }) {
  const theme = useTheme();
  return <Button label={`${formatDisplayDate(date)} · ${time || 'No time'}`} variant="secondary" icon={<Clock3 size={theme.controls.icon} color={theme.colors.text.primary} />}
    onPress={onPress} disabled={disabled} testID={testID} />;
}
