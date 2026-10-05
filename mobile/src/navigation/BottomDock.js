import { useState } from 'react';
import { BarChart3, BookOpen, HeartPulse, Plus, Settings2 } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '../design-system';

const tabs = [
  { route: 'index', label: 'Today', icon: HeartPulse },
  { route: 'diary', label: 'Diary', icon: BookOpen },
  { route: 'insights', label: 'Insights', icon: BarChart3 },
  { route: 'profile', label: 'Profile', icon: Settings2 },
];

/** @param {import('expo-router/build/react-navigation/bottom-tabs/types').BottomTabBarProps & {onLog: () => void, onHeightChange: (height: number) => void}} props */
export function BottomDock({ state, navigation, insets, onLog, onHeightChange }) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const dockWidth = Math.min(theme.navigation.dockMaxWidth, Math.max(0, width - theme.navigation.dockInset * 2));
  const logWidth = Math.max(theme.controls.minimumTouchTarget,
    Math.min(theme.navigation.logSize + Math.max(0, fontScale - 1) * theme.typography.logLabel.fontSize,
      dockWidth - (theme.spacing.sm + theme.controls.borderWidth) * 2 - theme.controls.minimumTouchTarget * 4 - theme.controls.borderWidth * 2));
  const byRoute = new Map(state.routes.map((route) => [route.name, route]));
  /** @param {string} name */
  const navigate = (name) => {
    const route = byRoute.get(name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };
  /** @param {number} index */
  const renderTab = (index) => {
    const tab = tabs[index];
    return <DockTab key={tab.route} {...tab} active={state.routes[state.index]?.name === tab.route} onPress={() => navigate(tab.route)} />;
  };
  const accent = theme.colors.entry.symptom.fg;
  return <View testID="bottom-dock" onLayout={({ nativeEvent }) => { if (nativeEvent.layout.height > 0) onHeightChange(nativeEvent.layout.height); }}
    style={{ position: 'absolute', alignSelf: 'center', zIndex: 20, bottom: insets.bottom + theme.spacing.md, width: dockWidth }}>
    <View style={{
      flexDirection: 'row', alignItems: 'stretch',
      backgroundColor: theme.colors.surface.card,
      borderColor: theme.colors.border.default,
      borderRadius: theme.radius.lg,
      borderWidth: theme.controls.borderWidth,
      padding: theme.spacing.sm,
      shadowColor: theme.colors.text.primary,
      shadowOffset: { width: theme.navigation.dockShadow.width, height: theme.navigation.dockShadow.height },
      shadowRadius: theme.navigation.dockShadow.radius,
      shadowOpacity: theme.navigation.dockShadow.opacity,
      elevation: theme.navigation.dockShadow.elevation,
    }}>
      {renderTab(0)}
      {renderTab(1)}
      <LogButton onPress={onLog} accent={accent} fontScale={fontScale} width={logWidth} />
      {renderTab(2)}
      {renderTab(3)}
    </View>
  </View>;
}

/** @param {{label: string, icon: import('lucide-react-native').LucideIcon, active: boolean, onPress: () => void, route: string}} props */
function DockTab({ label, icon: Icon, active, onPress, route }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const color = active ? theme.colors.text.primary : theme.colors.text.secondary;
  return <Pressable testID={`tab-${route}`} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} aria-selected={active}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({
      flex: 1, minWidth: theme.controls.minimumTouchTarget, minHeight: theme.controls.minimumTouchTarget,
      alignItems: 'center', justifyContent: 'center',
      gap: theme.spacing.xs / 2,
      paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.radius.md,
      backgroundColor: active ? theme.colors.surface.subtle : 'transparent',
      opacity: pressed ? 0.76 : 1,
      outlineColor: theme.colors.focus,
      outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
      outlineOffset: theme.spacing.xs,
    })}>
    <Icon size={theme.navigation.dockIcon} color={color} strokeWidth={1.9} />
    <Text style={[theme.typography.navLabel, { color, width: '100%' }]}>{label}</Text>
  </Pressable>;
}

/** @param {{onPress: () => void, accent: string, fontScale: number, width: number}} props */
function LogButton({ onPress, accent, fontScale, width }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable testID="open-log" accessibilityRole="button" accessibilityLabel="Log"
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({
      width,
      minHeight: theme.navigation.logSize + Math.max(0, fontScale - 1) * theme.typography.logLabel.lineHeight,
      alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
      marginTop: -theme.navigation.logRaise,
      marginHorizontal: theme.controls.borderWidth,
      borderWidth: theme.navigation.logBorder, borderRadius: theme.radius.lg,
      borderColor: theme.colors.surface.canvas, backgroundColor: accent,
      opacity: pressed ? 0.76 : 1,
      outlineColor: theme.colors.focus,
      outlineWidth: focused ? theme.controls.selectedBorderWidth : 0,
      outlineOffset: theme.spacing.xs,
      shadowColor: accent,
      shadowOffset: { width: theme.navigation.logShadow.width, height: theme.navigation.logShadow.height },
      shadowRadius: theme.navigation.logShadow.radius,
      shadowOpacity: theme.navigation.logShadow.opacity,
      elevation: theme.navigation.logShadow.elevation,
    })}>
    <Plus size={theme.controls.icon + theme.spacing.xs} color={theme.isDark ? theme.colors.surface.canvas : theme.colors.surface.card} strokeWidth={2.4} />
    <Text style={[theme.typography.logLabel, { width: '100%', color: theme.isDark ? theme.colors.surface.canvas : theme.colors.surface.card }]}>{'Log'}</Text>
  </Pressable>;
}
