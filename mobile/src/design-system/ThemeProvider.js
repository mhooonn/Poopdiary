import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkTheme, lightTheme } from './theme';
import { createAppearanceStore } from './appearanceStorage';

/** @typedef {'light' | 'dark' | 'system'} Appearance */
/** @typedef {{appearance: Appearance, setAppearance:(appearance:Appearance)=>Promise<void>}} AppearanceState */

const ThemeContext = createContext(/** @type {import('./theme').Theme | null} */ (null));
const AppearanceContext = createContext(/** @type {AppearanceState | null} */ (null));
const ReducedMotionContext = createContext(false);
const appearanceStore = createAppearanceStore(AsyncStorage);

/** @param {{children: import('react').ReactNode, initialAppearance?: Appearance}} props */
export function ThemeProvider({ children, initialAppearance = 'system' }) {
  const systemAppearance = useColorScheme();
  const [appearance, setAppearance] = useState(initialAppearance);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const theme = (appearance === 'system' ? systemAppearance : appearance) === 'dark' ? darkTheme : lightTheme;
  const saveAppearance = useCallback(/** @type {(value:Appearance)=>Promise<void>} */ (async (value) => {
    const saved = await appearanceStore.save(value);
    setAppearance(saved);
  }), []);
  const appearanceState = useMemo(() => ({ appearance, setAppearance: saveAppearance }), [appearance, saveAppearance]);

  useEffect(() => {
    let active = true;
    void appearanceStore.read(initialAppearance)
      .then((saved) => { if (active) setAppearance(saved); })
      .catch(() => undefined)
      .finally(() => { if (active) setAppearanceReady(true); });
    return () => { active = false; };
  }, [initialAppearance]);

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
    if (!appearanceReady) return;
    void SystemUI.setBackgroundColorAsync(theme.colors.surface.canvas).catch(() => undefined);
  }, [appearanceReady, theme]);

  return (
    <AppearanceContext.Provider value={appearanceState}>
      <ThemeContext.Provider value={theme}>
        <ReducedMotionContext.Provider value={reducedMotion}>
          {appearanceReady
            ? <><StatusBar style={theme.isDark ? 'light' : 'dark'} />{children}</>
            : <View testID="theme-loading" style={{ flex: 1, backgroundColor: theme.colors.surface.canvas }} />}
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
