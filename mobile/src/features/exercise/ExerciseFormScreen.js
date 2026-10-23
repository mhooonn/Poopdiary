// ExerciseFormScreen
// Form screen for logging a new exercise entry or editing an existing one.
// Create mode:  /exercise
// Edit mode:    /exercise?edit=ID  (opened from the Diary)

import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Shared UI components from our design system, so every screen looks the same
import {
  AppText,
  Button,
  Card,
  Choice,
  NoteField,
  Screen,
  useTheme,
} from '../../design-system';

// Backend API functions: create a new entry, load one by id, update an existing one
import {
  createExercise,
  getExercise,
  updateExercise,
} from '../../data/api';
// Shows the "saved" message (toast) on the next screen after we navigate away
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
// Hook that protects the screen from being left while a save is in progress
import { useWriteGuard } from '../../navigation/useWriteGuard';

// Options shown as radio-style choices in the form
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
// (getMonth() starts from 0, so we add 1; padStart makes "5" into "05")
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

// Turns any thrown value into a message we can show the user.
// Real Error objects use their own message, anything else gets a generic one.
/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

// Checks that the date is in YYYY-MM-DD format AND is a real calendar date.
// The second check catches dates like 2026-02-31, which JavaScript would
// silently roll over to March 3rd.
/** @param {string} value */
function validDate(value) {
  // Format check first
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  // Noon is used so time zone / daylight saving shifts can't change the day
  const parsed = new Date(`${value}T12:00:00`);

  // If the parsed year/month/day match the input, the date really exists
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10))
  );
}

// Checks 24-hour time in HH:MM format (00:00 - 23:59)
/** @param {string} value */
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function ExerciseFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { notify } = useRecordFeedback();

  // The ?edit=ID value from the URL. URL params can be string, array or
  // undefined, so we only accept a string and otherwise use ''.
  const editParam =
    typeof params.edit === 'string' ? params.edit : '';

  // ---- Form field state (with default values for a new entry) ----
  const [exerciseType, setExerciseType] = useState('Walking');
  const [duration, setDuration] = useState('30'); // kept as text because it comes from a TextInput
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState('');

  // Id of the record being edited. null means we are creating a new one.
  const [editingId, setEditingId] = useState(
    /** @type {number | null} */ (null)
  );

  // ---- UI state ----
  const [loading, setLoading] = useState(false); // true while saving
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editParam)); // true while fetching the entry to edit
  const [error, setError] = useState(''); // message shown under the form
  // The date the entry had when it was loaded. Used to return to the right
  // day in the Diary if the user cancels the edit.
  const [recordDate, setRecordDate] = useState(today());

  // A ref (not state) tracking an in-progress save. Refs update immediately,
  // so a fast double tap on Save can't start two saves.
  const writing = useRef(false);
  useWriteGuard(loading, writing);

  // Tracks whether the screen is still on screen. After an async call we
  // check this so we don't update state on an unmounted component.
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const editing = editParam !== '';

  // Back button handler: do nothing while saving; otherwise go back to the
  // Diary (on the entry's day) when editing, or to the home screen when creating.
  const exit = () => {
    if (writing.current) return;
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDate } });
    else router.dismissTo('/');
  };

  // Load existing exercise when opening /exercise?edit=ID
  useEffect(() => {
    // Create mode, nothing to load
    if (!editParam) return;

    // Flag used to ignore the result if the screen closes or the id changes
    // before the request finishes (cleanup below sets it to false)
    let active = true;

    async function loadExercise() {
      setLoadingEdit(true);
      setError('');
      setEditingId(null);

      try {
        // Validate the id from the URL: it must be a positive whole number
        if (!/^[1-9]\d*$/.test(editParam) || !Number.isSafeInteger(Number(editParam))) {
          throw new Error('Exercise entry not found.');
        }
        const id = Number(editParam);

        const record = await getExercise(id);

        // Screen was closed while waiting, so drop the result
        if (!active) return;

        // Fill the form with the saved values
        setEditingId(record.id);
        setExerciseType(record.exercise_type);
        setDuration(String(record.duration_minutes));
        setDate(record.local_date);
        setRecordDate(record.local_date);

        // The server stores a timestamp; convert it back to local HH:MM for the input
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

    // Cleanup: mark this load as outdated
    return () => {
      active = false;
    };
  }, [editParam]);

  // Validates the form, then creates or updates the entry
  async function handleSave() {
    // Ignore taps while already saving, or while the entry to edit is still loading
    if (writing.current || (editing && (loadingEdit || editingId === null))) return;
    setError('');

    // ---- Validation: stop at the first problem and show a message ----
    if (!exerciseType.trim()) {
      setError('Please select an exercise type.');
      return;
    }

    const minutes = Number(duration);

    // Only digits allowed, must be a safe integer and greater than zero
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
    // new Date() reads the string as local time; toISOString() later gives UTC.
    const occurredAt = new Date(`${date}T${time}:00`);

    if (!Number.isFinite(occurredAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    // The object sent to the backend (field names match the API)
    const exercise = {
      exercise_type: exerciseType,
      duration_minutes: minutes,
      occurred_at: occurredAt.toISOString(),
      local_date: date, // also stored separately so the Diary can group by the user's own day
      notes: notes.trim(),
    };

    // Lock the form while the request is running
    writing.current = true;
    setLoading(true);

    try {
      // Update if we have an id, otherwise create a new entry
      if (editingId !== null) {
        await updateExercise(editingId, exercise);
      } else {
        await createExercise(exercise);
      }

      // Only navigate if the user hasn't already left the screen
      if (mounted.current) {
        notify(editing ? 'Changes saved' : 'Exercise entry saved');
        if (editing) router.dismissTo({ pathname: '/diary', params: { date } });
        else router.dismissTo('/');
      }
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      // Always unlock, even if the save failed
      writing.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  // Shared style for all the text inputs, built from theme values
  // so it follows the app's design system
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
      {/* While loading an entry to edit, show only a loading text */}
      {loadingEdit ? (
        <AppText tone="secondary">
          Loading exercise...
        </AppText>
      ) : (
        <>
          {/* Exercise type: one choice can be selected at a time (radio buttons) */}
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

          {/* Duration in minutes; number-pad keyboard shows only digits */}
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

          {/* Date as text; maxLength 10 fits YYYY-MM-DD */}
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

          {/* Time as text; maxLength 5 fits HH:MM */}
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

          {/* Optional free-text notes */}
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

          {/* Validation or server error. accessibilityLiveRegion makes
              screen readers announce it when it appears. */}
          {error !== '' && (
            <AppText
              tone="danger"
              accessibilityLiveRegion="polite"
            >
              {error}
            </AppText>
          )}

          {/* Disabled while saving, or when editing before the entry has loaded */}
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