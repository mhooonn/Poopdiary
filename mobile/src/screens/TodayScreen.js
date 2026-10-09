import { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CircleDot, Droplets, Utensils } from 'lucide-react-native';

import { AppText, Button, EmptyState, InlineNotice, LoadingState, MetricCard, QuickLogCard, Screen, useTheme } from '../design-system';
import { DiaryEntryCard } from '../features/diary/DiaryEntryCard';
import { useDiaryEntries } from '../features/diary/useDiaryEntries';
import { SOURCE_LABELS } from '../features/diary/model';
import { formatDate } from '../shared/dateTime';

/** @type {{key:string,label:string,path:string,tone:'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep',Icon:import('lucide-react-native').LucideIcon}[]} */
const QUICK_LOGS = [
  { key: 'food', label: 'Food', path: '/food', tone: 'food', Icon: Utensils },
  { key: 'bowel', label: 'Bowel', path: '/bowel', tone: 'bowel', Icon: CircleDot },
  { key: 'water', label: 'Drinks', path: '/water', tone: 'water', Icon: Droplets },
];

/** @param {number} hour */
function greeting(hour) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** A small, connected Today view. It only counts sources that currently have an API. */
export function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const today = formatDate(now);
  const { entries, errors, loading, refresh } = useDiaryEntries(today);
  /** @param {'food'|'bowel'|'water'} kind */
  const unavailable = (kind) => loading || errors.some((error) => error.kind === kind);
  const foodCount = entries.filter((entry) => entry.kind === 'food').length;
  const bowelCount = entries.filter((entry) => entry.kind === 'bowel').length;
  const drinkAmount = entries.filter((entry) => entry.kind === 'water').reduce((sum, entry) => sum + entry.record.amount_ml, 0);
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const first = greeting(now.getHours());
  const availableWidth = Math.min(width, theme.controls.contentWidth) - theme.spacing.md * 2;
  const compactRow = availableWidth / fontScale >= theme.controls.minimumTouchTarget * 6;
  const recentEntries = entries.filter((entry) => entry.time !== null).slice(-4).reverse();
  const displayedEntries = [...recentEntries, ...entries.filter((entry) => entry.time === null)].slice(0, 4);
  const failedSources = errors.map((error) => SOURCE_LABELS[error.kind]).join(', ');

  return <Screen testID="today-screen">
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="heroTitle">{first}</AppText>
      <AppText tone="secondary">{dateLabel}</AppText>
    </View>

    <View style={{ gap: theme.spacing.sm }} testID="today-quick-log">
      <AppText variant="sectionTitle">Quick log</AppText>
      <View style={{ flexDirection: compactRow ? 'row' : 'column', gap: theme.spacing.sm }}>
        {QUICK_LOGS.map(({ key, label, path, tone, Icon }) => <QuickLogCard key={key} label={label} tone={tone} variant="compact"
          icon={<Icon size={theme.controls.icon} color={theme.colors.entry[tone].fg} />} onPress={() => router.push(path)} testID={`today-log-${key}`} />)}
      </View>
    </View>

    <View style={{ gap: theme.spacing.sm }} testID="today-overview">
      <AppText variant="sectionTitle">Today at a glance</AppText>
      <View style={{ flexDirection: compactRow ? 'row' : 'column', gap: theme.spacing.sm }}>
        <MetricCard label="Food" value={unavailable('food') ? '—' : foodCount} unit={unavailable('food') ? '' : foodCount === 1 ? 'entry' : 'entries'} tone="food" icon={<Utensils size={theme.controls.smallIcon} color={theme.colors.entry.food.fg} />} testID="today-food-count" />
        <MetricCard label="Bowel" value={unavailable('bowel') ? '—' : bowelCount} unit={unavailable('bowel') ? '' : bowelCount === 1 ? 'entry' : 'entries'} tone="bowel" icon={<CircleDot size={theme.controls.smallIcon} color={theme.colors.entry.bowel.fg} />} testID="today-bowel-count" />
        <MetricCard label="Drinks" value={unavailable('water') ? '—' : drinkAmount} unit={unavailable('water') ? '' : 'ml'} tone="water" icon={<Droplets size={theme.controls.smallIcon} color={theme.colors.entry.water.fg} />} testID="today-drink-total" />
      </View>
    </View>

    <View style={{ gap: theme.spacing.sm }} testID="today-recent">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Recent entries</AppText>
        <Button label="View diary" variant="text" onPress={() => router.push('/diary')} />
      </View>
      {errors.length > 0 && <InlineNotice title={`${failedSources} could not load`} actionLabel="Retry" onAction={() => void refresh()} loading={loading} testID="today-load-error" />}
      {loading && <LoadingState label="Loading entries" testID="today-loading" />}
      {!loading && errors.length === 0 && entries.length === 0 && <EmptyState title="No entries today" testID="today-empty" />}
      {!loading && displayedEntries.map((entry) => <DiaryEntryCard key={entry.key} entry={entry} onPress={() => router.push({ pathname: '/diary', params: { date: entry.localDate } })} />)}
    </View>
  </Screen>;
}
