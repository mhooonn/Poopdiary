import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/**
 * @typedef {{children: import('react').ReactNode, title?: string,
 *   subtitle?: string, footer?: import('react').ReactNode,
 *   scroll?: boolean, testID?: string, onBack?: () => void,
 *   right?: import('react').ReactNode}} ScreenProps
 */

/** @param {ScreenProps} props */
export function Screen({ children, title, subtitle, footer, scroll = true, testID, onBack, right }) {
  const theme = useTheme();
  const contentStyle = {
    width: /** @type {const} */ ('100%'),
    maxWidth: theme.controls.contentWidth,
    alignSelf: /** @type {const} */ ('center'),
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  };

  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: theme.colors.surface.canvas }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {(title || subtitle || onBack || right) && <View style={[contentStyle, { paddingTop: theme.spacing.lg, gap: theme.spacing.sm, flexDirection: 'row', alignItems: 'center' }]}>
          {onBack && <IconButton icon={ArrowLeft} label="Back" onPress={onBack} testID="screen-back" />}
          <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
            {title && <AppText variant="pageTitle" accessibilityRole="header">{title}</AppText>}
            {subtitle && <AppText tone="secondary">{subtitle}</AppText>}
          </View>
          {right}
        </View>}
        {scroll
          ? <ScrollView style={{ flex: 1 }} contentContainerStyle={[contentStyle, { paddingBottom: theme.spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>{children}</ScrollView>
          : <View style={[contentStyle, { flex: 1 }]}>{children}</View>}
        {footer && <View style={[contentStyle, { borderTopWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }]}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
