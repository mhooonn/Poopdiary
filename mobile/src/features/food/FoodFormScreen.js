
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

import { createFood, listFood, updateFood } from '../../data/api';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { useWriteGuard } from '../../navigation/useWriteGuard';

/** @typedef {{id:number,food_name:string,meal_type:string|null,date:string,time:string|null,notes:string|null}} FoodRecord */

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function FoodFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { notify } = useRecordFeedback();

  const editParam = typeof params.edit === 'string' ? params.edit : '';

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState(/** @type {string|null} */ ('Breakfast'));
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime());
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(
    /** @type {number|null} */ (null)
  );

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editParam));
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [recordDate, setRecordDate] = useState(today());
  const writing = useRef(false);
  useWriteGuard(saving, writing);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const editing = editParam !== '';
  const exit = () => {
    if (writing.current) return;
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDate } });
    else router.dismissTo('/');
  };

  /** @param {FoodRecord} record */
  function startEditing(record) {
    setEditingId(record.id);
    setFoodName(record.food_name);
    setMealType(record.meal_type);
    setDate(record.date);
    setTime(record.time || '');
    setNotes(record.notes || '');
    setRecordDate(record.date);
    setError('');
  }

  // Support opening the form from Diary with /food?edit=123
  useEffect(() => {
    if (!editParam) return;

    const controller = new AbortController();

    async function loadEntry() {
      setLoadingEdit(true);
      setLoadError('');
      setEditingId(null);

      try {
        if (!/^[1-9]\d*$/.test(editParam) || !Number.isSafeInteger(Number(editParam))) throw new Error('Food entry not found.');
        const records = await listFood({ signal: controller.signal });
        const record = records.find(
          (item) => item.id === Number(editParam)
        );

        if (!record) {
          throw new Error('Food entry not found.');
        }

        if (!controller.signal.aborted) startEditing(record);
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(errorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoadingEdit(false);
      }
    }

    void loadEntry();

    return () => {
      controller.abort();
    };
  }, [editParam, loadAttempt]);

  async function handleSave() {
    if (writing.current || (editing && (loadingEdit || loadError !== '' || editingId === null))) return;
    setError('');

    if (!foodName.trim()) {
      setError('Please enter a food name.');
      return;
    }

    const parsedDate = new Date(`${date}T12:00:00`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(date.slice(0, 4)) ||
      parsedDate.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      parsedDate.getDate() !== Number(date.slice(8, 10))
    ) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }

    if (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        setError('Enter a valid time in HH:MM format.');
        return;
    }

    const food = {
        foodName: foodName.trim(),
        mealType,
        date,
        time: time || null,
        notes: notes.trim(),
    };


    writing.current = true;
    setSaving(true);

    try {
      if (editingId !== null) {
        await updateFood(editingId, food);
      } else {
        await createFood(food);
      }

      if (mounted.current) {
        notify(editing ? 'Changes saved' : 'Food entry saved');
        if (editing) router.dismissTo({ pathname: '/diary', params: { date } });
        else router.dismissTo('/');
      }
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
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
      title={editing ? 'Edit food' : 'Log food'}
      onBack={exit}
      testID="food-form"
    >
      {editing && (loadingEdit || editingId === null) ? (
        loadError !== '' ? <>
          <AppText tone="danger" accessibilityLiveRegion="polite">{loadError}</AppText>
          <Button label="Retry" variant="secondary" onPress={() => setLoadAttempt((value) => value + 1)} />
        </> :
        <AppText tone="secondary">Loading food entry...</AppText>
      ) : (
        <>
          <Card>
            <AppText variant="label">Food name</AppText>

            <TextInput
              style={inputStyle}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="e.g. Rice and chicken"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Food name"
              testID="food-name"
              maxLength={150}
              editable={!saving}
            />
          </Card>

          <Card>
            <AppText variant="label">Meal type</AppText>

            <View style={{ gap: theme.spacing.sm }}>
              {MEALS.map((meal) => (
                <Choice
                  key={meal}
                  label={meal}
                  selected={mealType === meal}
                  onPress={() => setMealType(meal)}
                  disabled={saving}
                />
              ))}
            </View>
          </Card>

          <Card>
            <AppText variant="label">Date</AppText>

            <TextInput
              style={inputStyle}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.text.secondary}
              accessibilityLabel="Food date"
              testID="food-date"
              maxLength={10}
              editable={!saving}
            />
          </Card>
              
              
            <Card>
            <AppText variant="label">Time</AppText>

            <TextInput
                style={inputStyle}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM (e.g. 12:30)"
                placeholderTextColor={theme.colors.text.secondary}
                accessibilityLabel="Food time"
                testID="food-time"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={!saving}
            />
            </Card>


          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="food-notes"
              disabled={saving}
            />
          </Card>

          {error !== '' && (
            <AppText tone="danger">{error}</AppText>
          )}

          <Button
            label={editing ? 'Save changes' : 'Save food'}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            testID="food-save"
          />

        </>
      )}
    </Screen>
  );
}
