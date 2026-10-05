import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';

/**
 * @param {{
 *   children: import('react').ReactNode,
 *   style?: import('react-native').StyleProp<import('react-native').ViewStyle>,
 *   testID?: string,
 * }} props
 */
export function Card({ children, style, testID }) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.default,
          borderWidth: theme.controls.borderWidth,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
