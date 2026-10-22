
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

import {
  createSymptom,
  getSymptom,
  updateSymptom,
} from '../../data/api';

const SYMPTOM_TYPES = [
  'Bloating',
  'Abdominal pain',
  'Nausea',
  'Heartburn',
  'Gas',
  'Cramps',
  'Other',
];

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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

  return Number.isFinite(parsed.getTime())
    && parsed.getFullYear() === Number(value.slice(0, 4))
    && parsed.getMonth() + 1 === Number(value.slice(5, 7))
    && parsed.getDate() === Number(value.slice(8, 10));
}

/** @param {string} value */
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function SymptomFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const editParam =
    typeof params.edit === 'string' ? params.edit : '';

  const [symptomType, setSymptomType] = useState('Bloating');
  const [severity, setSeverity] = useState(5);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(
    /** @type {number|null} */ (null)
  );

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const editing = editParam !== '';

  // Load an existing symptom when editing
  useEffect(() => {
    if (!editParam) return;

    let active = true;

    async function loadSymptom() {
      setLoadingEdit(true);
      setError('');

      try {
        const record = await getSymptom(Number(editParam));

        if (!active) return;

        setEditingId(record.id);
        setSymptomType(record.symptom_type);
        setSeverity(record.severity);
        setDate(record.local_date);

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

    return () => {
      active = false;
    };
  }, [editParam]);

  function resetForm() {
    setSymptomType('Bloating');
    setSeverity(5);
    setDate(today());
    setTime(currentTime());
    setNotes('');
    setEditingId(null);
  }

  async function handleSave() {
    setError('');
    setMessage('');

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

    const occurredAt = new Date(`${date}T${time}:00`);

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

    const symptom = {
      symptom_type: symptomType,
      severity,
      occurred_at: occurredAt.toISOString(),
      local_date: date,
      notes: notes.trim(),
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateSymptom(editingId, symptom);
        router.back();
        return;
      }

      await createSymptom(symptom);

      resetForm();
      setMessage('Symptom saved successfully!');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
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
      title={editing ? 'Edit symptom' : 'Log symptom'}
      subtitle="Track how you're feeling"
      onBack={() => router.back()}
      testID="symptom-form"
    >
      {loadingEdit ? (
        <AppText tone="secondary">Loading symptom...</AppText>
      ) : (
        <>
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

          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="symptom-notes"
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

          {message !== '' && (
            <Card>
              <AppText>{message}</AppText>
            </Card>
          )}

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
