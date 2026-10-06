import { useState } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../design-system';
import { BottomDock } from '../../navigation/BottomDock';
import { LogSheet } from '../../navigation/LogSheet';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [logOpen, setLogOpen] = useState(false);
  const [dockHeight, setDockHeight] = useState(theme.controls.minimumTouchTarget + theme.spacing.sm * 2 + theme.controls.borderWidth * 2);
  const dockReserve = dockHeight + insets.bottom + theme.spacing.md * 2;
  return <>
    <Tabs tabBar={(props) => <BottomDock {...props} onLog={() => setLogOpen(true)} onHeightChange={setDockHeight} />}
      screenOptions={{ headerShown: false, sceneStyle: { paddingBottom: dockReserve, backgroundColor: theme.colors.surface.canvas } }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
    <LogSheet visible={logOpen} onClose={() => setLogOpen(false)} />
  </>;
}
