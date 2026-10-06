import { TextInput } from 'react-native';
import { useTheme } from '../ThemeProvider';

/** @param {{value:string,onChange:(text:string)=>void,disabled?:boolean,testID?:string}} props */
export function NoteField({ value, onChange, disabled = false, testID }) {
  const theme = useTheme();
  return <TextInput value={value} onChangeText={onChange} editable={!disabled} multiline maxLength={1000}
    accessibilityLabel="Note" placeholder="Note (optional)" placeholderTextColor={theme.colors.text.secondary} testID={testID}
    style={{ ...theme.typography.body, minHeight: theme.controls.minimumTouchTarget * 2,
      padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth,
      borderColor: theme.colors.border.control, backgroundColor: theme.colors.surface.card,
      color: theme.colors.text.primary, textAlignVertical: 'top' }} />;
}
