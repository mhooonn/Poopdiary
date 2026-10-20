
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppText,
  Button,
  Card,
  Choice,
  NoteField,
  Screen,
  useTheme,
} from '../../design-system';

import {
  createExercise,
  getExercise,
  updateExercise,
} from '../../data/api';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { useWriteGuard } from '../../navigation/useWriteGuard';

const EXERCISE_TYPES = [
  'Walking',
  'Running',
  'Cycling',
  'Gym',
  'Swimming',
  'Yoga',
  'Other',
];

// Current local date in YYYY-MM-DD
function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Current local time in HH:MM
function currentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

/** @param {string} value */
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T12:00:00`);

  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10))
  );
}

/** @param {string} value */
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function ExerciseFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { notify } = useRecordFeedback();

  const editParam =
    typeof params.edit === 'string' ? params.edit : '';

  const [exerciseType, setExerciseType] = useState('Walking');
  const [duration, setDuration] = useState('30');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(
    /** @type {number | null} */ (null)
  );

  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editParam));
  const [error, setError] = useState('');
  const [recordDate, setRecordDate] = useState(today());
  const writing = useRef(false);
  useWriteGuard(loading, writing);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const editing = editParam !== '';
  const exit = () => {
    if (writing.current) return;
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDate } });
    else router.dismissTo('/');
  };

  // Load existing exercise when opening /exercise?edit=ID
  useEffect(() => {
    if (!editParam) return;

    let active = true;

    async function loadExercise() {
      setLoadingEdit(true);
      setError('');
      setEditingId(null);

      try {
        if (!/^[1-9]\d*$/.test(editParam) || !Number.isSafeInteger(Number(editParam))) {
          throw new Error('Exercise entry not found.');
        }
        const id = Number(editParam);

        const record = await getExercise(id);

        if (!active) return;

        setEditingId(record.id);
        setExerciseType(record.exercise_type);
        setDuration(String(record.duration_minutes));
        setDate(record.local_date);
        setRecordDate(record.local_date);

        const recordedTime = new Date(record.occurred_at);
        setTime(
          `${String(recordedTime.getHours()).padStart(2, '0')}:` +
          `${String(recordedTime.getMinutes()).padStart(2, '0')}`
        );

        setNotes(record.notes || '');
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        if (active) setLoadingEdit(false);
      }
    }

    void loadExercise();

    return () => {
      active = false;
    };
  }, [editParam]);

  async function handleSave() {
    if (writing.current || (editing && (loadingEdit || editingId === null))) return;
    setError('');

    if (!exerciseType.trim()) {
      setError('Please select an exercise type.');
      return;
    }

    const minutes = Number(duration);

    if (
      !/^\d+$/.test(duration) ||
      !Number.isSafeInteger(minutes) ||
      minutes <= 0
    ) {
      setError('Duration must be a positive whole number.');
      return;
    }

    if (!validDate(date)) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }

    if (!validTime(time)) {
      setError('Enter a valid time in HH:MM format.');
      return;
    }

    // Convert selected local date/time into a UTC timestamp.
    const occurredAt = new Date(`${date}T${time}:00`);

    if (!Number.isFinite(occurredAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    const exercise = {
      exercise_type: exerciseType,
      duration_minutes: minutes,
      occurred_at: occurredAt.toISOString(),
      local_date: date,
      notes: notes.trim(),
    };

    writing.current = true;
    setLoading(true);

    try {
      if (editingId !== null) {
        await updateExercise(editingId, exercise);
      } else {
        await createExercise(exercise);
      }

      if (mounted.current) {
        notify(editing ? 'Changes saved' : 'Exercise entry saved');
        if (editing) router.dismissTo({ pathname: '/diary', params: { date } });
        else router.dismissTo('/');
      }
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      writing.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  const inputStyle = {
    ...theme.typography.body,
    minHeight: theme.controls.minimumTouchTarget,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: theme.controls.borderWidth,
    borderColor: theme.colors.border.control,
    backgroundColor: theme.colors.surface.card,
    color: theme.colors.text.primary,
  };

  return (
    <Screen
      title={editing ? 'Edit exercise' : 'Log exercise'}
      subtitle="Track your physical activity"
      onBack={exit}
      testID="exercise-form"
    >
      {loadingEdit ? (
        <AppText tone="secondary">
          Loading exercise...
        </AppText>
      ) : (
        <>
          <Card>
            <AppText variant="label">
              Exercise type
            </AppText>

            <View style={{ gap: theme.spacing.sm }}>
              {EXERCISE_TYPES.map((type) => (
                <Choice
                  key={type}
                  label={type}
                  selected={exerciseType === type}
                  onPress={() => setExerciseType(type)}
                  selectionRole="radio"
                  disabled={loading}
                />
              ))}
            </View>
          </Card>

          <Card>
            <AppText variant="label">
              Duration (minutes)
            </AppText>

            <TextInput
              style={inputStyle}
              value={duration}
              editable={!loading}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="e.g. 30"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Exercise duration"
              testID="exercise-duration"
            />
          </Card>

          <Card>
            <AppText variant="label">
              Date
            </AppText>

            <TextInput
              style={inputStyle}
              value={date}
              editable={!loading}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Exercise date"
              testID="exercise-date"
              maxLength={10}
            />
          </Card>

          <Card>
            <AppText variant="label">
              Time
            </AppText>

            <TextInput
              style={inputStyle}
              value={time}
              editable={!loading}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Exercise time"
              testID="exercise-time"
              maxLength={5}
            />
          </Card>

          <Card>
            <AppText variant="label">
              Notes (optional)
            </AppText>

            <NoteField
              value={notes}
              disabled={loading}
              onChange={setNotes}
              testID="exercise-notes"
            />
          </Card>

          {error !== '' && (
            <AppText
              tone="danger"
              accessibilityLiveRegion="polite"
            >
              {error}
            </AppText>
          )}

          <Button
            label={editing ? 'Save changes' : 'Save exercise'}
            onPress={() => void handleSave()}
            loading={loading}
            disabled={loading || (editing && editingId === null)}
            testID="exercise-save"
          />
        </>
      )}
    </Screen>
  );
}
