import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';

import { AppText, Button, Card, IconButton, Screen, useTheme } from '../design-system';
import { DiaryEntryCard } from '../features/diary/DiaryEntryCard';
import { DiaryEntryDetails } from '../features/diary/DiaryEntryDetails';
import { useDiaryEntries } from '../features/diary/useDiaryEntries';
import { isDiaryDate, SOURCE_LABELS } from '../features/diary/model';
import { formatDate } from '../features/bowel/model';
import { useLogMenu } from '../navigation/LogMenuProvider';

/** @param {string} date @param {number} amount */
function shiftDate(date, amount) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return formatDate(next);
}

/** One timeline and one detail flow for all connected features. */
export function DiaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, fontScale } = useWindowDimensions();
  const { openLog } = useLogMenu();
  const [selected, setSelected] = useState(/** @type {string|null} */ (null));
  const today = formatDate(new Date());
  const requestedDate = typeof params.date === 'string' ? params.date : '';
  const date = isDiaryDate(requestedDate) ? requestedDate : today;
  const { entries, errors, loading, refresh, removeEntry } = useDiaryEntries(date);
  const current = entries.find((entry) => entry.key === selected);
  const dateWindow = [-2, -1, 0, 1, 2].map((offset) => shiftDate(date, offset));
  const compact = (Math.min(width, theme.controls.contentWidth) - theme.spacing.md * 2) / fontScale
    < theme.controls.minimumTouchTarget * 7 + theme.spacing.sm * 6;
  /** @param {string} next */
  const setDate = (next) => { setSelected(null); router.setParams({ date: next }); };
  const previous = <IconButton icon={ChevronLeft} label="Previous day" onPress={() => setDate(shiftDate(date, -1))} testID="diary-previous" />;
  const next = <IconButton icon={ChevronRight} label="Next day" onPress={() => setDate(shiftDate(date, 1))} testID="diary-next" />;

  return <Screen title="Diary" testID="diary-screen" right={<IconButton icon={Plus} label="Log" onPress={openLog} testID="diary-log" />}>
    <View style={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderTopWidth: theme.controls.borderWidth, borderBottomWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }}>
      {compact && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        {previous}
        <AppText variant="label" tone="secondary" style={{ textAlign: 'center' }}>{new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</AppText>
        {next}
      </View>}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: theme.spacing.xs }}>
        {!compact && previous}
        <View style={{ flex: 1, flexDirection: 'row', gap: theme.spacing.xs }}>
          {dateWindow.map((key) => {
            const day = new Date(`${key}T12:00:00`);
            const selectedDay = key === date;
            return <Pressable key={key} testID={`diary-day-${key}`} accessibilityRole="button"
              accessibilityLabel={day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              accessibilityState={{ selected: selectedDay }} onPress={() => setDate(key)}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: theme.controls.minimumTouchTarget,
                paddingHorizontal: theme.spacing.xs, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md,
                gap: theme.spacing.xs, alignItems: 'center', justifyContent: 'center', position: 'relative',
                borderRadius: theme.radius.md, backgroundColor: selectedDay || pressed ? theme.colors.surface.subtle : 'transparent' })}>
              <AppText variant="label" style={{ textAlign: 'center' }}>{day.getDate()}</AppText>
              <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>{day.toLocaleDateString('en-GB', { weekday: fontScale >= 1.5 ? 'narrow' : 'short' })}</AppText>
              <View pointerEvents="none" style={{ position: 'absolute', bottom: theme.spacing.xs, width: theme.spacing.xs, height: theme.spacing.xs,
                borderRadius: theme.radius.pill, backgroundColor: key === today ? theme.colors.entry.bowel.fg : 'transparent' }} />
            </Pressable>;
          })}
        </View>
        {!compact && next}
      </View>
    </View>
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="eyebrow" tone="secondary">{date === today ? 'TODAY' : 'SELECTED DAY'}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle" accessibilityRole="header" testID="diary-date">{new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</AppText>
        <AppText variant="caption" tone="secondary" testID="diary-count">{loading ? 'Loading…' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${errors.length ? ' loaded' : ''}`}</AppText>
      </View>
      {date !== today && <Button label="Today" variant="text" onPress={() => setDate(today)} />}
    </View>
    {errors.length > 0 && <Card testID="diary-load-error">
      {errors.map((error) => <View key={error.kind} style={{ gap: theme.spacing.xs }}>
        <AppText variant="label" tone="danger">{SOURCE_LABELS[error.kind]} could not load</AppText>
        <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{error.message}</AppText>
      </View>)}
      <Button label="Retry" variant="secondary" onPress={() => void refresh()} disabled={loading} testID="diary-retry" />
    </Card>}
    {entries.map((entry) => <DiaryEntryCard key={entry.key} entry={entry} onPress={() => setSelected(entry.key)} />)}
    {!loading && errors.length === 0 && entries.length === 0 && <Card testID="diary-empty" style={{ minHeight: theme.controls.minimumTouchTarget * 4,
      alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: theme.spacing.sm }}>
      <BookOpen size={theme.controls.icon + theme.spacing.sm} color={theme.colors.text.secondary} />
      <AppText variant="label" tone="secondary" style={{ textAlign: 'center' }}>No entries on this day</AppText>
    </Card>}
    {current && <DiaryEntryDetails key={current.key} entry={current} onClose={() => setSelected(null)} onDeleted={removeEntry} />}
  </Screen>;
}
