import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Coffee, CupSoda, Droplet, GlassWater, Leaf, Milk, Wine } from 'lucide-react-native';
import { AppText } from './AppText';
import { useTheme } from '../ThemeProvider';

const icons = { water: Droplet, coffee: Coffee, tea: Leaf, soda: CupSoda, juice: GlassWater, milk: Milk, alcohol: Wine, custom: GlassWater };

/** @param {{type:keyof typeof icons,label:string,selected?:boolean,onPress:()=>void,disabled?:boolean,testID?:string}} props */
export function DrinkChoice({ type, label, selected = false, onPress, disabled = false, testID }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const color = theme.colors.beverage[type];
  const Icon = icons[type];
  return <Pressable testID={testID} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ minHeight: theme.controls.minimumTouchTarget, padding: theme.spacing.sm, gap: theme.spacing.sm,
      borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth, borderColor: selected ? color.fg : theme.colors.border.control,
      backgroundColor: selected || pressed ? color.bg : theme.colors.surface.card, opacity: disabled ? 0.55 : 1,
      outlineColor: theme.colors.focus, outlineWidth: focused ? theme.controls.selectedBorderWidth : 0, outlineOffset: theme.spacing.xs,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center' })}>
    <View accessible={false} aria-hidden style={{ width: theme.controls.smallIcon, height: theme.controls.smallIcon, flexShrink: 0 }}>
      {selected ? <Check size={theme.controls.smallIcon} color={color.fg} /> : <Icon size={theme.controls.smallIcon} color={color.fg} />}
    </View>
    <AppText variant="label" style={{ color: color.fg, flexShrink: 1, textAlign: 'center' }}>{label}</AppText>
  </Pressable>;
}
