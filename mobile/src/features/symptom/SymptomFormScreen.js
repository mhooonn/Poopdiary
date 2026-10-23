// SymptomFormScreen
// Form screen for logging a new symptom or editing an existing one.
// Create mode:  /symptom
// Edit mode:    /symptom?edit=ID  (opened from the Diary)

import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Shared UI components from our design system (Slider is used for severity)
import {
  AppText,
  Button,
  Card,
  Choice,
  NoteField,
  Screen,
  Slider,
  useTheme,
} from '../../design-system';

// Backend API functions: create, load one by id, update
import {
  createSymptom,
  getSymptom,
  updateSymptom,
} from '../../data/api';

// Options shown as radio-style choices in the form
const SYMPTOM_TYPES = [
  'Bloating',
  'Abdominal pain',
  'Nausea',
  'Heartburn',
  'Gas',
  'Cramps',
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

// Turns any thrown value into a message we can show the user
/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

// Checks that the date is in YYYY-MM-DD format AND is a real calendar date.
// This catches dates like 2026-02-31, which JavaScript would silently
// roll over to March 3rd.
/** @param {string} value */
function validDate(value) {
  // Format check first
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  // Noon is used so time zone / daylight saving shifts can't change the day
  const parsed = new Date(`${value}T12:00:00`);

  // If the parsed year/month/day match the input, the date really exists
  return Number.isFinite(parsed.getTime())
    && parsed.getFullYear() === Number(value.slice(0, 4))
    && parsed.getMonth() + 1 === Number(value.slice(5, 7))
    && parsed.getDate() === Number(value.slice(8, 10));
}

// Checks 24-hour time in HH:MM format (00:00 - 23:59)
/** @param {string} value */
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function SymptomFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // The ?edit=ID value from the URL. URL params can be string, array or
  // undefined, so we only accept a string and otherwise use ''.
  const editParam =
    typeof params.edit === 'string' ? params.edit : '';

  // ---- Form field state (with default values for a new entry) ----
  const [symptomType, setSymptomType] = useState('Bloating');
  const [severity, setSeverity] = useState(5); // 1-10 slider value
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState('');

  // Id of the record being edited. null means we are creating a new one.
  const [editingId, setEditingId] = useState(
    /** @type {number|null} */ (null)
  );

  // ---- UI state ----
  const [saving, setSaving] = useState(false); // true while the save request runs
  const [loadingEdit, setLoadingEdit] = useState(false); // true while fetching the entry to edit
  const [error, setError] = useState(''); // error message shown under the form
  const [message, setMessage] = useState(''); // success message shown after creating

  const editing = editParam !== '';

  // Load an existing symptom when editing
  useEffect(() => {
    // Create mode, nothing to load
    if (!editParam) return;

    // Flag used to ignore the result if the screen closes or the id changes
    // before the request finishes (cleanup below sets it to false)
    let active = true;

    async function loadSymptom() {
      setLoadingEdit(true);
      setError('');

      try {
        const record = await getSymptom(Number(editParam));

        // Screen was closed while waiting, so drop the result
        if (!active) return;

        // Fill the form with the saved values
        setEditingId(record.id);
        setSymptomType(record.symptom_type);
        setSeverity(record.severity);
        setDate(record.local_date);

        // The server stores a timestamp; convert it back to local HH:MM for the input
        const recorded = new Date(record.occurred_at);
        setTime(
          `${String(recorded.getHours()).padStart(2, '0')}:` +
          `${String(recorded.getMinutes()).padStart(2, '0')}`
        );

        setNotes(record.notes || '');
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        if (active) setLoadingEdit(false);
      }
    }

    void loadSymptom();

    // Cleanup: mark this load as outdated
    return () => {
      active = false;
    };
  }, [editParam]);

  // Puts the form back to its default values so another symptom
  // can be logged right after saving
  function resetForm() {
    setSymptomType('Bloating');
    setSeverity(5);
    setDate(today());
    setTime(currentTime());
    setNotes('');
    setEditingId(null);
  }

  // Validates the form, then creates or updates the entry
  async function handleSave() {
    // Clear messages from the previous attempt
    setError('');
    setMessage('');

    // ---- Validation: stop at the first problem and show a message ----
    if (!symptomType.trim()) {
      setError('Please select a symptom.');
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

    // Convert selected local date/time into a Date object.
    // new Date() reads the string as local time; toISOString() later gives UTC.
    const occurredAt = new Date(`${date}T${time}:00`);

    // Extra safety check: the Date must be valid and must still match what
    // the user typed (JavaScript can silently shift invalid values)
    if (
      !Number.isFinite(occurredAt.getTime()) ||
      occurredAt.getFullYear() !== Number(date.slice(0, 4)) ||
      occurredAt.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      occurredAt.getDate() !== Number(date.slice(8, 10)) ||
      occurredAt.getHours() !== Number(time.slice(0, 2)) ||
      occurredAt.getMinutes() !== Number(time.slice(3, 5))
    ) {
      setError('Invalid date or time.');
      return;
    }

    // The object sent to the backend (field names match the API)
    const symptom = {
      symptom_type: symptomType,
      severity,
      occurred_at: occurredAt.toISOString(),
      local_date: date, // also stored separately so the Diary can group by the user's own day
      notes: notes.trim(),
    };

    // Show the loading state on the button
    setSaving(true);

    try {
      // Editing: update the entry and go back to the previous screen
      if (editingId !== null) {
        await updateSymptom(editingId, symptom);
        router.back();
        return;
      }

      // Creating: save, clear the form and show a success message
      await createSymptom(symptom);

      resetForm();
      setMessage('Symptom saved successfully!');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      // Always stop the loading state, even if the save failed
      setSaving(false);
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
      title={editing ? 'Edit symptom' : 'Log symptom'}
      subtitle="Track how you're feeling"
      onBack={() => router.back()}
      testID="symptom-form"
    >
      {/* While loading an entry to edit, show only a loading text */}
      {loadingEdit ? (
        <AppText tone="secondary">Loading symptom...</AppText>
      ) : (
        <>
          {/* Symptom type: one choice can be selected at a time (radio buttons) */}
          <Card>
            <AppText variant="label">Symptom type</AppText>

            <View style={{ gap: theme.spacing.sm }}>
              {SYMPTOM_TYPES.map((type) => (
                <Choice
                  key={type}
                  label={type}
                  selected={symptomType === type}
                  onPress={() => setSymptomType(type)}
                  selectionRole="radio"
                />
              ))}
            </View>
          </Card>

          {/* Severity slider from 1 (mild) to 10 (severe) */}
          <Card>
            <Slider
              label="Severity"
              value={severity}
              onChange={setSeverity}
              min={1}
              max={10}
              valueLabel={`${severity} / 10`}
              testID="symptom-severity"
            />
          </Card>

          {/* Date as text; maxLength 10 fits YYYY-MM-DD */}
          <Card>
            <AppText variant="label">Date</AppText>

            <TextInput
              style={inputStyle}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Symptom date"
              testID="symptom-date"
              maxLength={10}
            />
          </Card>

          {/* Time as text; maxLength 5 fits HH:MM */}
          <Card>
            <AppText variant="label">Time</AppText>

            <TextInput
              style={inputStyle}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Symptom time"
              testID="symptom-time"
              maxLength={5}
            />
          </Card>

          {/* Optional free-text notes */}
          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="symptom-notes"
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

          {/* Success message, shown after a new symptom has been saved */}
          {message !== '' && (
            <Card>
              <AppText>{message}</AppText>
            </Card>
          )}

          {/* Disabled while saving, or when editing before the entry has loaded */}
          <Button
            label={editing ? 'Save changes' : 'Save symptom'}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving || (editing && editingId === null)}
            testID="symptom-save"
          />
        </>
      )}
    </Screen>
  );
}