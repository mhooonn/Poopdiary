import { Text } from 'react-native';

import { useTheme } from '../ThemeProvider';

/**
 * @typedef {import('react-native').TextProps & {
 *   variant?: keyof import('../theme').Theme['typography'],
 *   tone?: 'primary' | 'secondary' | 'danger'
 * }} AppTextProps
 */

/** @param {AppTextProps} props */
export function AppText({ variant = 'body', tone = 'primary', style, ...props }) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.colors.feedback.danger.fg : theme.colors.text[tone];
  return <Text {...props} style={[theme.typography[variant], { color, flexShrink: 1 }, style]} />;
}
