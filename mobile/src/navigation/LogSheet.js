import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, RecordIcon, Sheet, useTheme } from '../design-system';

const options = /** @type {const} */ ([
  { label: 'Food', path: '/food', type: 'food' },
  { label: 'Bowel', path: '/bowel', type: 'bowel' },
  { label: 'Symptoms', path: '/symptom', type: 'symptom' },
  { label: 'Drinks', path: '/water', type: 'water' },
  { label: 'Exercise', path: '/exercise', type: 'exercise' },
  { label: 'Sleep', path: '/sleep', type: 'sleep' },
]);

/** @param {{visible: boolean, onClose: () => void}} props */
export function LogSheet({ visible, onClose }) {
  const theme = useTheme();
  const router = useRouter();
  return <Sheet visible={visible} title="Log" onClose={onClose}>
    {options.map(({ label, path, type }) => <Pressable key={path}
      testID={`log-${type}`} accessibilityRole="button" accessibilityLabel={label}
      onPress={() => { onClose(); router.push(path); }}
      style={({ pressed }) => ({
        minHeight: theme.controls.minimumTouchTarget,
        flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderWidth: theme.controls.borderWidth,
        borderColor: theme.colors.border.default,
        borderRadius: theme.radius.md,
        backgroundColor: pressed ? theme.colors.surface.subtle : theme.colors.surface.canvas,
      })}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RecordIcon type={type} />
      </View>
      <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
      <ArrowRight size={theme.controls.smallIcon} color={theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />
    </Pressable>)}
  </Sheet>;
}
