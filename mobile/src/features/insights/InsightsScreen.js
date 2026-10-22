import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { listBowel, listDrinks, listExercise, listFood, subscribeRecordChanges } from '../../data/api';
import { AppText, Button, Card, RecordIcon, Screen, useTheme } from '../../design-system';
import { dayLabel, shortDate, summarizeInsights } from './model';

const RANGE_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
];
const ACTIVITY_SERIES = /** @type {const} */ ([
  { key: 'food', label: 'Food' },
  { key: 'bowel', label: 'Bowel' },
  { key: 'water', label: 'Drinks' },
  { key: 'exercise', label: 'Exercise' },
]);

/** @typedef {'food'|'bowel'|'water'|'exercise'} SourceKind */
/** @typedef {{kind:SourceKind,message:string}} SourceError */
const SOURCE_LABELS = /** @type {Record<SourceKind, string>} */ ({ food: 'Food', bowel: 'Bowel', water: 'Drinks', exercise: 'Exercise' });

/** @typedef {{food: any[], bowel: any[], water: any[], exercise: any[]}} Records */

function initialRecords() {
  return /** @type {Records} */ ({ food: [], bowel: [], water: [], exercise: [] });
}

export function InsightsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [range, setRange] = useState(7);
  const [focusedRange, setFocusedRange] = useState(/** @type {number|null} */ (null));
  const [records, setRecords] = useState(initialRecords);
  const [errors, setErrors] = useState(/** @type {SourceError[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const request = useRef(/** @type {AbortController|null} */ (null));

  const refresh = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    Promise.allSettled([
      listFood({ signal: controller.signal }),
      listBowel({ signal: controller.signal }),
      listDrinks({ signal: controller.signal }),
      listExercise({ signal: controller.signal }),
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const nextErrors = /** @type {SourceError[]} */ ([]);
      const next = initialRecords();
      results.forEach((result, index) => {
        const kind = /** @type {SourceKind} */ (['food', 'bowel', 'water', 'exercise'][index]);
        if (result.status === 'fulfilled') next[kind] = result.value;
        else nextErrors.push({ kind, message: result.reason instanceof Error ? result.reason.message : 'Could not load records.' });
      });
      setRecords(next);
      setErrors(nextErrors);
      setLoading(false);
    });
    return controller;
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    const unsubscribe = subscribeRecordChanges(() => { void refresh(); });
    return () => {
      unsubscribe();
      request.current?.abort();
    };
  }, [refresh]));

  const summary = summarizeInsights(records, range);
  const hasRecords = summary.totals.entries > 0;
  const loggedDays = summary.daily.filter((day) => day.food + day.bowel + day.water + day.exercise > 0).length;
  const retry = () => refresh();

  return <Screen title="Insights" testID="insights-screen">
    <View testID="insights-range" accessibilityRole="radiogroup" accessibilityLabel="Time range" style={{ gap: theme.spacing.sm }}>
      <AppText variant="eyebrow" tone="secondary">PERIOD</AppText>
      <View style={{ flexDirection: 'row', padding: theme.spacing.xs, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface.card }}>
        {RANGE_OPTIONS.map((option) => {
          const selected = range === option.value;
          return <Pressable
            key={option.value}
            testID={`insights-range-${option.value}`}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() => setRange(option.value)}
            onFocus={() => setFocusedRange(option.value)}
            onBlur={() => setFocusedRange((current) => current === option.value ? null : current)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: theme.controls.minimumTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: theme.controls.borderWidth,
              borderColor: selected ? theme.colors.border.selected : 'transparent',
              borderRadius: theme.radius.sm,
              outlineColor: theme.colors.focus,
              outlineWidth: focusedRange === option.value ? theme.controls.selectedBorderWidth : 0,
              outlineOffset: theme.spacing.xs,
              backgroundColor: selected || pressed ? theme.colors.surface.subtle : 'transparent',
            })}
          >
            <AppText variant="label" numberOfLines={1} style={{ color: selected ? theme.colors.text.primary : theme.colors.text.secondary }}>{option.label}</AppText>
          </Pressable>;
        })}
      </View>
    </View>

    {errors.length > 0 && hasRecords && <Card testID="insights-errors" style={{ borderColor: theme.colors.feedback.warning.fg, backgroundColor: theme.colors.feedback.warning.bg }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
        <AlertCircle size={theme.controls.icon} color={theme.colors.feedback.warning.fg} strokeWidth={theme.controls.iconStrokeWidth} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="label">Some records could not be loaded</AppText>
          <AppText variant="caption" tone="secondary">The available sections are still shown.</AppText>
          {errors.map((error) => <AppText key={error.kind} variant="caption" tone="secondary">{SOURCE_LABELS[error.kind]} records unavailable</AppText>)}
          <Button label="Try again" variant="text" icon={<RefreshCw size={theme.controls.icon} color={theme.colors.text.primary} strokeWidth={theme.controls.iconStrokeWidth} />} onPress={retry} testID="insights-retry" />
        </View>
      </View>
    </Card>}

    {loading ? <LoadingState /> : !hasRecords && errors.length > 0 ? <UnavailableState onRetry={retry} /> : !hasRecords ? <EmptyState onLog={() => router.push('/')} /> : <>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', paddingBottom: theme.spacing.md, borderBottomWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default }} testID="insights-summary">
        <Metric label="Entries" value={summary.totals.entries} />
        <SummaryDivider />
        <Metric label="Days logged" value={loggedDays} />
        <SummaryDivider />
        <Metric label="Bowel" value={summary.totals.bowel} />
      </View>

      <Card testID="insights-activity" style={{ gap: theme.spacing.md }}>
        <SectionHeading icon={BarChart3} title="Logging activity" subtitle={`${summary.totals.entries} ${summary.totals.entries === 1 ? 'entry' : 'entries'} in ${range} days`} />
        <ActivityChart daily={summary.daily} theme={theme} />
      </Card>

      {summary.totals.bowel > 0 && <Card testID="insights-bowel" style={{ gap: theme.spacing.md }}>
        <SectionHeading type="bowel" title="Bowel movements" subtitle="Recorded stool types in this period" />
        <Distribution rows={summary.typeDistribution.filter((row) => row.count > 0)} total={summary.totals.bowel} theme={theme} />
      </Card>}

      <Card testID="insights-breakdown" style={{ gap: theme.spacing.md }}>
        <AppText variant="sectionTitle">Record breakdown</AppText>
        <BreakdownRow type="food" label="Food" value={`${summary.totals.food} ${summary.totals.food === 1 ? 'entry' : 'entries'}`} />
        <BreakdownRow type="bowel" label="Bowel" value={`${summary.totals.bowel} ${summary.totals.bowel === 1 ? 'entry' : 'entries'}`} />
        <BreakdownRow type="water" label="Drinks" value={`${summary.totals.drinks} · ${summary.totals.drinkMl.toLocaleString()} ml`} />
        <BreakdownRow type="exercise" label="Exercise" value={`${summary.totals.exercise} · ${summary.totals.exerciseMinutes} min`} />
      </Card>

      {summary.symptoms.some((row) => row.count > 0) && <Card testID="insights-symptoms" style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Reported alongside bowel movements</AppText>
        <AppText variant="caption" tone="secondary">These are symptoms you selected while logging a bowel movement.</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {summary.symptoms.filter((row) => row.count > 0).map((row) => <View key={row.code} style={{ paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.subtle }}><AppText variant="label">{row.label} · {row.count}</AppText></View>)}
        </View>
      </Card>}
    </>}
  </Screen>;
}

function LoadingState() {
  const theme = useTheme();
  return <View testID="insights-loading" accessible accessibilityRole="progressbar" accessibilityLabel="Loading insights" style={{ gap: theme.spacing.md }}>
    {[0, 1, 2].map((item) => <View key={item} style={{ height: item === 1 ? 180 : 72, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface.subtle, opacity: item === 1 ? 0.7 : 0.5 }} />)}
  </View>;
}

/** @param {{onLog:()=>void}} props */
function EmptyState({ onLog }) {
  const theme = useTheme();
  return <Card testID="insights-empty" style={{ paddingVertical: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }}>
    <BarChart3 size={32} color={theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />
    <AppText variant="sectionTitle">Nothing to review yet</AppText>
    <AppText tone="secondary" style={{ textAlign: 'center' }}>Your summaries will appear here after you log something.</AppText>
    <Button label="Go to Today" variant="secondary" onPress={onLog} testID="insights-empty-action" />
  </Card>;
}

/** @param {{onRetry:()=>void}} props */
function UnavailableState({ onRetry }) {
  const theme = useTheme();
  return <Card testID="insights-unavailable" style={{ paddingVertical: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }}>
    <AlertCircle size={theme.controls.icon + theme.spacing.sm} color={theme.colors.feedback.warning.fg} strokeWidth={theme.controls.iconStrokeWidth} />
    <AppText variant="sectionTitle">Insights unavailable</AppText>
    <AppText tone="secondary" style={{ textAlign: 'center' }}>Could not load your records. Check your connection and try again.</AppText>
    <Button label="Try again" variant="secondary" onPress={onRetry} testID="insights-retry-empty" />
  </Card>;
}

/** @param {{label:string,value:string|number}} props */
function Metric({ label, value }) {
  const theme = useTheme();
  return <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs, alignItems: 'center' }}><AppText variant="eyebrow" tone="secondary" numberOfLines={1}>{label}</AppText><AppText variant="sectionTitle">{value}</AppText></View>;
}

function SummaryDivider() {
  const theme = useTheme();
  return <View style={{ width: theme.controls.borderWidth, backgroundColor: theme.colors.border.default, marginHorizontal: theme.spacing.sm }} />;
}

/** @param {{icon?:any,type?:'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep',title:string,subtitle:string}} props */
function SectionHeading({ icon: Icon, type, title, subtitle }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>{type ? <RecordIcon type={type} /> : <Icon size={theme.controls.icon} color={theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />}<View style={{ flex: 1, gap: theme.spacing.xs }}><AppText variant="sectionTitle">{title}</AppText><AppText variant="caption" tone="secondary">{subtitle}</AppText></View></View>;
}

/** @param {{daily:{date:string,food:number,bowel:number,water:number,exercise:number}[],theme:any}} props */
function ActivityChart({ daily, theme }) {
  const max = Math.max(1, ...daily.map((day) => day.food + day.bowel + day.water + day.exercise));
  const showDayLabels = daily.length <= 14;
  const seriesColors = {
    food: theme.colors.entry.food.fg,
    bowel: theme.colors.entry.bowel.fg,
    water: theme.colors.entry.water.fg,
    exercise: theme.colors.entry.exercise.fg,
  };
  return <View style={{ gap: theme.spacing.sm }}>
    <View style={{ height: 130, flexDirection: 'row', alignItems: 'stretch', gap: daily.length > 14 ? 2 : theme.spacing.xs }}>
      {daily.map((day) => {
        const count = ACTIVITY_SERIES.reduce((total, series) => total + day[series.key], 0);
        return <View key={day.date} accessible accessibilityRole="image" accessibilityLabel={`${shortDate(day.date)}, ${count} logged entries`} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{ width: '100%', maxWidth: 22, height: `${Math.max(count ? 10 : 2, (count / max) * 100)}%`, flexDirection: 'column-reverse', borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface.subtle, overflow: 'hidden' }}>
              {count > 0 && ACTIVITY_SERIES.filter((series) => day[series.key] > 0).map((series) => <View key={series.key} style={{ flex: day[series.key], backgroundColor: seriesColors[series.key] }} />)}
            </View>
          </View>
          {showDayLabels && <View style={{ height: theme.typography.caption.lineHeight + theme.spacing.xs, justifyContent: 'flex-end' }}><AppText variant="caption" tone="secondary" numberOfLines={1}>{dayLabel(day.date)}</AppText></View>}
        </View>;
      })}
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="caption" tone="secondary">{shortDate(daily[0].date)}</AppText><AppText variant="caption" tone="secondary">{shortDate(daily[daily.length - 1].date)}</AppText></View>
    <View accessibilityRole="list" accessibilityLabel="Activity types" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.sm }}>
      {ACTIVITY_SERIES.map((series) => <View key={series.key} style={{ width: '50%', minHeight: theme.controls.minimumTouchTarget / 2, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View accessible={false} style={{ width: 9, height: 9, borderRadius: theme.radius.pill, backgroundColor: seriesColors[series.key] }} />
        <AppText variant="caption" tone="secondary">{series.label}</AppText>
      </View>)}
    </View>
  </View>;
}

/** @param {{rows:{code:number|null,label:string,description?:string,count:number}[],total:number,theme:any}} props */
function Distribution({ rows, total, theme }) {
  if (rows.length === 0) return <AppText variant="caption" tone="secondary">No bowel records in this period.</AppText>;
  return <View style={{ gap: theme.spacing.md }}>{rows.map((row) => <View key={String(row.code)} style={{ gap: theme.spacing.xs }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
        <AppText variant="label">{row.label}</AppText>
        {row.description ? <AppText variant="caption" tone="secondary">{row.description}</AppText> : null}
      </View>
      <AppText variant="label">{row.count} <AppText variant="caption" tone="secondary">{Math.round((row.count / total) * 100)}%</AppText></AppText>
    </View>
    <View style={{ height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface.subtle, overflow: 'hidden' }}><View style={{ width: `${(row.count / total) * 100}%`, height: '100%', borderRadius: theme.radius.pill, backgroundColor: theme.colors.entry.bowel.fg }} /></View>
  </View>)}</View>;
}

/** @param {{type:'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep',label:string,value:string}} props */
function BreakdownRow({ type, label, value }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.controls.minimumTouchTarget }}><RecordIcon type={type} /><AppText style={{ flex: 1 }}>{label}</AppText><AppText variant="label" style={{ textAlign: 'right' }}>{value}</AppText></View>;
}

