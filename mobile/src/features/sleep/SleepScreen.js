import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText, Button, Choice, NoteField, Screen, useTheme } from '../../design-system';
import { createSleep, getSleep, updateSleep } from '../../data/api';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { formatDate, formatTime } from '../bowel/model';
import { formatDuration, MORNING_ENERGY_LABELS, SLEEP_QUALITY_LABELS } from '../diary/model';

// Turns { 1: 'Poor', 2: 'Fair' } into [{ value: 1, label: '1 · Poor' }, ...]
/** @param {Record<number,string>} labels */
const scale = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value: Number(value), label: `${value} · ${label}` }));

const QUALITY = scale(SLEEP_QUALITY_LABELS);
const ENERGY = scale(MORNING_ENERGY_LABELS);
const WAKEUPS = [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n === 4 ? '4+' : String(n) }));

// "23:00" -> minutes after midnight, or null if the time is not valid
/** @param {string} text */
function parseTime(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

// Local date and time as a Date. dayOffset -1 means the day before.
/** @param {string} day @param {number} minutes @param {number} dayOffset */
function toDate(day, minutes, dayOffset = 0) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d + dayOffset, Math.floor(minutes / 60), minutes % 60);
}

// A row of choices. Tapping the chosen one again clears it when `optional` is set.
/** @param {{title:string, options:{value:number,label:string}[], value:number|null, onChange:(v:number|null)=>void, optional?:boolean, disabled?:boolean}} props */
function Options({ title, options, value, onChange, optional = false, disabled = false }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="sectionTitle">{title}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {options.map((option) => (
          <Choice
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(optional && value === option.value ? null : option.value)}
            disabled={disabled}
            density="compact"
            style={{ flexBasis: '47%', flexGrow: 1 }}
          />
        ))}
      </View>
    </View>
  );
}

/** @param {{editId?:string}} props */
function SleepForm({ editId }) {
  const theme = useTheme();
  const router = useRouter();
  const { notify } = useRecordFeedback();

  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(/** @type {number|null} */ (null));
  const [wakeups, setWakeups] = useState(0);
  const [energy, setEnergy] = useState(/** @type {number|null} */ (null));
  const [note, setNote] = useState('');
  const [wakeDate, setWakeDate] = useState(formatDate(new Date()));

  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // When editing, load the saved entry into the form
  useEffect(() => {
    if (!editId) return undefined;
    let active = true;

    getSleep(Number(editId))
      .then((record) => {
        if (!active) return;
        setBedtime(formatTime(new Date(record.sleep_start)));
        setWakeTime(formatTime(new Date(record.sleep_end)));
        setQuality(record.quality);
        setWakeups(record.awakenings);
        setEnergy(record.morning_energy);
        setNote(record.notes ?? '');
        setWakeDate(record.local_date);
        setLoading(false);
      })
      .catch((failure) => {
        if (!active) return;
        setError(failure instanceof Error ? failure.message : 'Could not load the entry.');
        setLoading(false);
      });

    return () => { active = false; };
  }, [editId]);

  // Length of the night, shown live above the form
  const bed = parseTime(bedtime);
  const wake = parseTime(wakeTime);
  const duration = bed !== null && wake !== null && bed !== wake
    ? (wake - bed + 1440) % 1440
    : null;

  const colors = theme.colors.entry.sleep ?? {
    bg: theme.colors.surface.subtle,
    fg: theme.colors.text.primary,
  };

  async function save() {
    if (bed === null || wake === null || bed === wake) {
      setError('Enter two different times as HH:MM, for example 23:00.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const draft = {
        sleep_end: toDate(wakeDate, wake).toISOString(),
        // Going to bed after the wake-up time means the night started the day before
        sleep_start: toDate(wakeDate, bed, bed > wake ? -1 : 0).toISOString(),
        local_date: wakeDate,
        quality,
        awakenings: wakeups,
        morning_energy: energy,
        notes: note.trim() || null,
      };

      const saved = editId
        ? await updateSleep(Number(editId), draft)
        : await createSleep(draft);

      notify(editId ? 'Changes saved' : 'Sleep entry saved');
      router.dismissTo({ pathname: '/diary', params: { date: saved.local_date } });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the entry.');
      setSaving(false);
    }
  }

  const timeInput = {
    ...theme.typography.body,
    minHeight: theme.controls.minimumTouchTarget,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: theme.controls.borderWidth,
    borderColor: theme.colors.border.control,
    backgroundColor: theme.colors.surface.card,
    color: theme.colors.text.primary,
    textAlign: /** @type {const} */ ('center'),
  };

  const back = () => router.dismissTo(editId ? { pathname: '/diary', params: { date: wakeDate } } : '/');

  if (loading) {
    return <Screen title="Sleep" onBack={back}><AppText tone="secondary">Loading…</AppText></Screen>;
  }

  return (
    <Screen title={editId ? 'Edit sleep' : 'Sleep'} onBack={back} testID="sleep-screen">
      {/* Summary card: the duration updates as the times change */}
      <View style={{ padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: colors.bg, gap: theme.spacing.xs }}>
        <AppText variant="eyebrow" style={{ color: colors.fg }}>TIME ASLEEP</AppText>
        <AppText variant="pageTitle" style={{ color: colors.fg }}>
          {duration === null ? '—' : formatDuration(duration)}
        </AppText>
      </View>

      {/* Bedtime and wake-up time */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {[
          { label: 'Went to bed', value: bedtime, onChange: setBedtime, id: 'sleep-bedtime' },
          { label: 'Woke up', value: wakeTime, onChange: setWakeTime, id: 'sleep-waketime' },
        ].map((field) => (
          <View key={field.id} style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText variant="caption" tone="secondary">{field.label}</AppText>
            <TextInput
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/[^0-9:]/g, ''))}
              editable={!saving}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel={`${field.label}, HH:MM`}
              testID={field.id}
              style={timeInput}
            />
          </View>
        ))}
      </View>

      <Options title="Sleep quality" options={QUALITY} value={quality} onChange={setQuality} optional disabled={saving} />
      <Options title="Wake-ups during the night" options={WAKEUPS} value={wakeups} onChange={(v) => setWakeups(v ?? 0)} disabled={saving} />
      <Options title="How did you feel in the morning?" options={ENERGY} value={energy} onChange={setEnergy} optional disabled={saving} />

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Note</AppText>
        <NoteField value={note} onChange={setNote} disabled={saving} testID="sleep-note" />
      </View>

      {error !== '' && <AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText>}

      <Button
        label={editId ? 'Save changes' : 'Save entry'}
        onPress={() => void save()}
        loading={saving}
        disabled={saving}
        testID="sleep-save"
      />
    </Screen>
  );
}

export function SleepScreen() {
  const { edit } = useLocalSearchParams();
  const editId = typeof edit === 'string' ? edit : undefined;
  return <SleepForm key={editId ?? 'new'} editId={editId} />;
}