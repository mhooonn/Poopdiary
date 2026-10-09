
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
  useTheme,
} from '../../design-system';

import { createFood, listFood, updateFood } from '../../data/api';
import { FoodDiarySection } from './FoodDiarySection';

/** @typedef {{id:number,food_name:string,meal_type:string|null,date:string,notes:string|null}} FoodRecord */

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function FoodFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const editParam = typeof params.edit === 'string' ? params.edit : '';

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('Breakfast');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(
    /** @type {number|null} */ (null)
  );

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const editing = editingId !== null;

  /** @param {FoodRecord} record */
  function startEditing(record) {
    setEditingId(record.id);
    setFoodName(record.food_name);
    setMealType(record.meal_type || 'Breakfast');
    setDate(record.date);
    setNotes(record.notes || '');
    setError('');
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setFoodName('');
    setMealType('Breakfast');
    setNotes('');
    setError('');
  }

  // Support opening the form from Diary with /food?edit=123
  useEffect(() => {
    if (!editParam) return;

    let active = true;

    async function loadEntry() {
      setLoadingEdit(true);
      setError('');

      try {
        const records = await listFood();
        const record = records.find(
          (item) => item.id === Number(editParam)
        );

        if (!record) {
          throw new Error('Food entry not found.');
        }

        if (active) startEditing(record);
      } catch (failure) {
        if (active) setError(errorMessage(failure));
      } finally {
        if (active) setLoadingEdit(false);
      }
    }

    void loadEntry();

    return () => {
      active = false;
    };
  }, [editParam]);

  async function handleSave() {
    setError('');
    setMessage('');

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

    const food = {
      foodName: foodName.trim(),
      mealType,
      date,
      notes: notes.trim(),
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateFood(editingId, food);
      } else {
        await createFood(food);
      }

      const wasEditing = editingId !== null;

      resetForm();
      setReloadKey((value) => value + 1);

      if (editParam) {
        router.back();
        return;
      }

      setMessage(
        wasEditing ? 'Food entry updated.' : 'Food entry saved.'
      );
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
      title={editing ? 'Edit food' : 'Log food'}
      subtitle="Record what you ate"
      onBack={() => router.back()}
      testID="food-form"
    >
      {loadingEdit ? (
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
            />
          </Card>

          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="food-notes"
            />
          </Card>

          {error !== '' && (
            <AppText tone="danger">{error}</AppText>
          )}

          {message !== '' && (
            <AppText>{message}</AppText>
          )}

          <Button
            label={editing ? 'Save changes' : 'Save food'}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
            testID="food-save"
          />

          {editing && !editParam && (
            <Button
              label="Cancel editing"
              variant="secondary"
              onPress={resetForm}
              disabled={saving}
            />
          )}

          {/* Temporary history until shared Diary is integrated */}
          <FoodDiarySection
            date={date}
            reloadKey={reloadKey}
            onEdit={startEditing}
          />
        </>
      )}
    </Screen>
  );
}
