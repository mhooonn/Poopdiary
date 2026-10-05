import { useRouter } from 'expo-router';
import { ArrowRight, Activity, CupSoda, Dumbbell, Moon, Toilet, Utensils } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Sheet, useTheme } from '../design-system';

const options = /** @type {const} */ ([
  { label: 'Food', path: '/food', type: 'food', icon: Utensils },
  { label: 'Bowel', path: '/bowel', type: 'bowel', icon: Toilet },
  { label: 'Symptoms', path: '/symptom', type: 'symptom', icon: Activity },
  { label: 'Drinks', path: '/water', type: 'water', icon: CupSoda },
  { label: 'Exercise', path: '/exercise', type: 'exercise', icon: Dumbbell },
  { label: 'Sleep', path: '/sleep', type: 'sleep', icon: Moon },
]);

/** @param {{visible: boolean, onClose: () => void}} props */
export function LogSheet({ visible, onClose }) {
  const theme = useTheme();
  const router = useRouter();
  return <Sheet visible={visible} title="Log" onClose={onClose}>
    {options.map(({ label, path, type, icon: Icon }) => <Pressable key={path}
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
        <Icon size={theme.controls.icon} color={theme.colors.entry[type].fg} />
      </View>
      <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
      <ArrowRight size={theme.controls.smallIcon} color={theme.colors.text.secondary} />
    </Pressable>)}
  </Sheet>;
}
