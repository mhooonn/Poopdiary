import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { darkTheme, lightTheme } from './theme';

/** @typedef {'light' | 'dark' | 'system'} Appearance */
/** @typedef {{appearance: Appearance, setAppearance: import('react').Dispatch<import('react').SetStateAction<Appearance>>}} AppearanceState */

const ThemeContext = createContext(/** @type {import('./theme').Theme | null} */ (null));
const AppearanceContext = createContext(/** @type {AppearanceState | null} */ (null));
const ReducedMotionContext = createContext(false);

/** @param {{children: import('react').ReactNode, initialAppearance?: Appearance}} props */
export function ThemeProvider({ children, initialAppearance = 'system' }) {
  const systemAppearance = useColorScheme();
  const [appearance, setAppearance] = useState(initialAppearance);
  const [reducedMotion, setReducedMotion] = useState(false);
  const theme = (appearance === 'system' ? systemAppearance : appearance) === 'dark' ? darkTheme : lightTheme;
  const appearanceState = useMemo(() => ({ appearance, setAppearance }), [appearance]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReducedMotion(value);
    }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; listener.remove(); };
  }, []);

  useEffect(() => {
    // Match the native window to the screen, including exposed safe-area edges.
    void SystemUI.setBackgroundColorAsync(theme.colors.surface.canvas).catch(() => undefined);
  }, [theme]);

  return (
    <AppearanceContext.Provider value={appearanceState}>
      <ThemeContext.Provider value={theme}>
        <ReducedMotionContext.Provider value={reducedMotion}>
          <StatusBar style={theme.isDark ? 'light' : 'dark'} />
          {children}
        </ReducedMotionContext.Provider>
      </ThemeContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('Wrap the app in ThemeProvider before using shared UI.');
  return theme;
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('Wrap the app in ThemeProvider before changing appearance.');
  return appearance;
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext);
}
