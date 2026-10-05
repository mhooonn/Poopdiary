import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useReducedMotion, useTheme } from '../ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/**
 * @param {{visible: boolean, title: string, onClose: () => void,
 *   children: import('react').ReactNode}} props
 */
export function Sheet({ visible, title, onClose, children }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [backdrop] = useState(() => new Animated.Value(0));
  const [progress] = useState(() => new Animated.Value(1));
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) return undefined;
    closing.current = false;
    if (reducedMotion) {
      backdrop.setValue(1);
      progress.setValue(0);
      return undefined;
    }
    backdrop.setValue(0);
    progress.setValue(1);
    const animation = Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: theme.motion.normal, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: theme.motion.normal, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [visible, reducedMotion, backdrop, progress, theme.motion.normal]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reducedMotion) { onClose(); return; }
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: theme.motion.normal, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: theme.motion.normal, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onClose(); });
  };

  if (!visible) return null;
  return <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View testID="sheet-backdrop" style={[StyleSheet.absoluteFill, { opacity: backdrop, backgroundColor: theme.colors.overlay }]}>
        <Pressable testID="sheet-dismiss" onPress={close} accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View testID="sheet-panel" style={{
        width: '100%', maxWidth: theme.controls.contentWidth,
        maxHeight: Math.max(0, height - insets.top), alignSelf: 'center',
        backgroundColor: theme.colors.surface.card,
        borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg,
        overflow: 'hidden',
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }],
      }}>
        <SafeAreaView edges={['bottom', 'left', 'right']} accessibilityViewIsModal onAccessibilityEscape={close}
          style={{ maxHeight: '100%', padding: theme.spacing.md, gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <AppText variant="sectionTitle" accessibilityRole="header" style={{ flex: 1 }}>{title}</AppText>
            <IconButton icon={X} label="Close" onPress={close} testID="sheet-close" />
          </View>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}
