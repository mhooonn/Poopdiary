import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';

import { ThemeProvider, useReducedMotion, useTheme } from '../design-system';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  return <NavigationThemeProvider value={{ ...base, colors: { ...base.colors,
    primary: theme.colors.text.primary,
    background: theme.colors.surface.canvas,
    card: theme.colors.surface.card,
    text: theme.colors.text.primary,
    border: theme.colors.border.default,
    notification: theme.colors.feedback.danger.fg,
  } }}>
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.canvas }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.surface.canvas }, animation: reducedMotion ? 'none' : 'default' }} />
    </View>
  </NavigationThemeProvider>;
}

export default function RootLayout() {
  return <SafeAreaProvider><ThemeProvider><Navigation /></ThemeProvider></SafeAreaProvider>;
}
