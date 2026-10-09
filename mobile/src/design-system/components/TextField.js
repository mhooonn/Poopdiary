import { useState } from 'react';
import { TextInput, View, useWindowDimensions } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../ThemeProvider';

/** @param {{label?:string,value:string,onChangeText:(value:string)=>void,placeholder?:string,helper?:string,error?:string,reserveSupportingText?:boolean,disabled?:boolean,testID?:string,keyboardType?:import('react-native').KeyboardTypeOptions,maxLength?:number,autoCapitalize?:import('react-native').TextInputProps['autoCapitalize'],autoCorrect?:boolean}} props */
export function TextField({ label, value, onChangeText, placeholder, helper, error, reserveSupportingText = false, disabled = false, testID, keyboardType, maxLength, autoCapitalize, autoCorrect }) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const supportingText = error || helper || '';

  return <View style={{ gap: theme.spacing.xs, minWidth: 0 }}>
    {label && <AppText variant="label">{label}</AppText>}
    <TextInput value={value} onChangeText={onChangeText} editable={!disabled} placeholder={placeholder}
      placeholderTextColor={theme.colors.text.secondary} keyboardType={keyboardType} maxLength={maxLength}
      autoCapitalize={autoCapitalize} autoCorrect={autoCorrect}
      accessibilityLabel={label || placeholder} accessibilityHint={supportingText || undefined}
      accessibilityState={{ disabled }} testID={testID} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...theme.typography.body, minHeight: Math.max(theme.controls.minimumTouchTarget, theme.typography.body.lineHeight * fontScale + theme.spacing.md * 2),
        padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth,
        borderColor: error ? theme.colors.feedback.danger.fg : focused ? theme.colors.focus : theme.colors.border.control,
        outlineColor: theme.colors.focus, outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
        outlineOffset: theme.spacing.xs,
        backgroundColor: disabled ? theme.colors.disabled.background : theme.colors.surface.card,
        color: disabled ? theme.colors.disabled.foreground : theme.colors.text.primary }} />
    {(reserveSupportingText || Boolean(supportingText)) && <View style={{ height: theme.typography.caption.lineHeight * theme.controls.fieldSupportingLines * fontScale }}>
      <AppText variant="caption" tone={error ? 'danger' : 'secondary'} numberOfLines={theme.controls.fieldSupportingLines}
        accessibilityLabel={supportingText || undefined} accessibilityLiveRegion="polite"
        testID={testID ? `${testID}-supporting` : undefined}>{supportingText}</AppText>
    </View>}
  </View>;
}
