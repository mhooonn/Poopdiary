import { Pressable, View } from 'react-native';
import { ChevronRight, CupSoda, Utensils } from 'lucide-react-native';
import { AppText, useTheme } from '../../design-system';
import { StoolShape } from '../bowel/components/StoolShape';
import { SOURCE_LABELS } from './model';

/** @param {{entry:import('./model').DiaryEntry,onPress:()=>void}} props */
export function DiaryEntryCard({ entry, onPress }) {
  const theme = useTheme();
  const color = entry.kind === 'water' ? theme.colors.beverage[entry.record.drink_type] : theme.colors.entry[entry.kind];
  const Icon = entry.kind === 'food' ? Utensils : CupSoda;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${SOURCE_LABELS[entry.kind]}, ${entry.title}, ${entry.summary}, ${entry.time || 'Time not recorded'}`}
    testID={`${entry.kind}-entry-${entry.id}`} onPress={onPress}
    style={({ pressed }) => ({ padding: theme.spacing.md, gap: theme.spacing.sm, borderWidth: theme.controls.borderWidth,
      borderColor: theme.colors.border.default, borderRadius: theme.radius.lg, minHeight: theme.controls.minimumTouchTarget,
      backgroundColor: pressed ? theme.colors.surface.subtle : theme.colors.surface.card, flexDirection: 'row', alignItems: 'center' })}>
    <View style={{ width: theme.controls.minimumTouchTarget, height: theme.controls.minimumTouchTarget, borderRadius: theme.radius.md,
      alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
      {entry.kind === 'bowel' ? <StoolShape type={entry.record.stool_type} /> : <Icon size={theme.controls.icon} color={color.fg} />}
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <AppText variant="label" style={{ flexShrink: 1 }}>{entry.title}</AppText>
        <AppText variant="caption" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>{entry.time || 'No time'}</AppText>
      </View>
      <AppText variant="caption" tone="secondary">{entry.summary}</AppText>
      <AppText variant="caption" style={{ color: color.fg }}>{SOURCE_LABELS[entry.kind]}</AppText>
    </View>
    <ChevronRight size={theme.controls.smallIcon} color={theme.colors.text.secondary} />
  </Pressable>;
}
