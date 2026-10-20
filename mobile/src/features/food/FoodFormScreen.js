
import { useEffect, useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';

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
import { FoodPhotoField } from './components/FoodPhotoField';
import { foodPhotoStore } from './photoStore';

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
  const [photoDraft, setPhotoDraft] = useState(/** @type {{name:string,uri:string}|null} */ (null));
  const [existingPhotoUri, setExistingPhotoUri] = useState(/** @type {string|null} */ (null));
  const [photoRecordId, setPhotoRecordId] = useState(/** @type {number|null} */ (null));
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [cameraSettingsRequired, setCameraSettingsRequired] = useState(false);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [savedFoodId, setSavedFoodId] = useState(/** @type {number|null} */ (null));
  const [photoCommitFailed, setPhotoCommitFailed] = useState(false);

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
  const photoDraftRef = useRef(/** @type {{name:string,uri:string}|null} */ (null));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => () => {
    const draft = photoDraftRef.current;
    if (draft) void foodPhotoStore.discardDraft(draft.name).catch(() => undefined);
  }, []);

  const editing = editParam !== '';
  const currentExistingPhotoUri = photoRecordId === editingId ? existingPhotoUri : null;
  const photoLoading = editingId !== null && photoRecordId !== editingId;
  const exit = () => {
    if (writing.current || savedFoodId !== null) return;
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

  useEffect(() => {
    if (editingId === null) return undefined;

    let active = true;
    void foodPhotoStore.getPhotoUri(editingId)
      .then((uri) => {
        if (active) {
          setExistingPhotoUri(uri);
          setPhotoRecordId(editingId);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoError('Could not load the saved meal photo.');
          setPhotoRecordId(editingId);
        }
      });
    return () => { active = false; };
  }, [editingId]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let active = true;
    void ImagePicker.getPendingResultAsync().then((result) => {
      if (!active || !result) return;
      if ('canceled' in result && !result.canceled && result.assets?.[0]) {
        void savePickedPhoto(result.assets[0]);
      } else if (!('canceled' in result)) {
        setPhotoError('The camera could not return the meal photo. Try again.');
      }
    }).catch(() => {
      if (active) setPhotoError('The camera could not return the meal photo. Try again.');
    });
    return () => { active = false; };
  }, []);

  /** @param {import('expo-image-picker').ImagePickerAsset} asset */
  async function savePickedPhoto(asset) {
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const name = await foodPhotoStore.saveDraft(asset.uri, asset.width, asset.height);
      const draft = { name, uri: foodPhotoStore.draftUri(name) };
      if (!mounted.current) {
        await foodPhotoStore.discardDraft(name);
        return;
      }
      const previous = photoDraftRef.current;
      photoDraftRef.current = draft;
      setPhotoDraft(draft);
      setRemoveExistingPhoto(false);
      if (previous) void foodPhotoStore.discardDraft(previous.name).catch(() => undefined);
    } catch (failure) {
      if (mounted.current) setPhotoError(errorMessage(failure));
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  }

  async function takePhoto() {
    if (photoBusy || saving || savedFoodId !== null) return;
    setPhotoBusy(true);
    setPhotoError('');
    setCameraSettingsRequired(false);
    try {
      if (Platform.OS !== 'web') {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraSettingsRequired(!permission.canAskAgain);
          setPhotoError('Camera access is off. Allow it to take a meal photo.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, exif: false });
      if (!result.canceled && result.assets?.[0]) await savePickedPhoto(result.assets[0]);
    } catch (failure) {
      setPhotoError(errorMessage(failure));
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  }

  async function openCameraSettings() {
    try {
      await Linking.openSettings();
    } catch {
      setPhotoError('Could not open app settings. Open camera permissions from your device settings.');
    }
  }

  async function removePhoto() {
    if (photoBusy || saving || savedFoodId !== null) return;
    const draft = photoDraftRef.current;
    setPhotoError('');
    if (draft) {
      try {
        await foodPhotoStore.discardDraft(draft.name);
        photoDraftRef.current = null;
        setPhotoDraft(null);
        setRemoveExistingPhoto(false);
      } catch {
        setPhotoError('Could not remove the meal photo from this device. Try again.');
      }
    } else {
      setRemoveExistingPhoto(Boolean(currentExistingPhotoUri));
    }
  }

  /** @param {number} foodId */
  async function syncLocalPhoto(foodId) {
    const draft = photoDraftRef.current;
    if (draft) {
      await foodPhotoStore.attachDraft(foodId, draft.name);
      photoDraftRef.current = null;
      setPhotoDraft(null);
          setExistingPhotoUri(null);
      setPhotoRecordId(foodId);
      setRemoveExistingPhoto(false);
    } else if (removeExistingPhoto) {
      await foodPhotoStore.removePhoto(foodId);
      setExistingPhotoUri(null);
      setRemoveExistingPhoto(false);
    }
  }

  /** @param {string} recordDateValue */
  function finishSave(recordDateValue) {
    if (!mounted.current) return;
    notify(editing ? 'Changes saved' : 'Food entry saved');
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDateValue } });
    else router.dismissTo('/');
  }

  async function continueWithoutNewPhoto() {
    if (savedFoodId === null || !photoDraftRef.current || removeExistingPhoto) return;
    const draft = photoDraftRef.current;
    try {
      await foodPhotoStore.discardDraft(draft.name);
    } catch {
      setPhotoError('The entry is saved, but the unfinished photo could not be removed.');
      return;
    }
    photoDraftRef.current = null;
    setPhotoDraft(null);
    finishSave(date);
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

    if (savedFoodId !== null) {
      writing.current = true;
      setSaving(true);
      try {
        await syncLocalPhoto(savedFoodId);
        setPhotoCommitFailed(false);
        finishSave(date);
      } catch {
        setPhotoError(photoDraftRef.current
          ? 'Food details were saved, but the meal photo could not be stored on this device. Try again.'
          : 'Food details were saved, but the photo could not be removed from this device. Try again.');
        setPhotoCommitFailed(true);
      } finally {
        writing.current = false;
        if (mounted.current) setSaving(false);
      }
      return;
    }

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
      const response = editingId !== null
        ? await updateFood(editingId, food)
        : await createFood(food);

      try {
        await syncLocalPhoto(response.id);
      } catch {
        setSavedFoodId(response.id);
        setPhotoCommitFailed(true);
        setPhotoError(photoDraftRef.current
          ? 'Food details were saved, but the meal photo could not be stored on this device. Try again.'
          : 'Food details were saved, but the photo could not be removed from this device. Try again.');
        return;
      }

      finishSave(date);
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
              editable={!saving && savedFoodId === null}
            />
          </Card>

          <FoodPhotoField
            uri={photoDraft?.uri ?? (removeExistingPhoto ? null : currentExistingPhotoUri)}
            loading={photoLoading}
            busy={photoBusy || saving || savedFoodId !== null}
            actionLoading={photoBusy}
            error={photoError}
            settingsRequired={cameraSettingsRequired}
            onTakePhoto={() => void takePhoto()}
            onRemove={() => void removePhoto()}
            onOpenSettings={() => void openCameraSettings()}
          />

          <Card>
            <AppText variant="label">Meal type</AppText>

            <View style={{ gap: theme.spacing.sm }}>
              {MEALS.map((meal) => (
                <Choice
                  key={meal}
                  label={meal}
                  selected={mealType === meal}
                  onPress={() => setMealType(meal)}
                  disabled={saving || savedFoodId !== null}
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
              editable={!saving && savedFoodId === null}
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
                editable={!saving && savedFoodId === null}
            />
            </Card>


          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="food-notes"
              disabled={saving || savedFoodId !== null}
            />
          </Card>

          {error !== '' && (
            <AppText tone="danger" accessibilityLiveRegion="polite" testID="food-save-error">{error}</AppText>
          )}

          <Button
            label={savedFoodId !== null ? 'Retry photo save' : (editing ? 'Save changes' : 'Save food')}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving || photoBusy || photoLoading}
            testID="food-save"
          />
          {photoCommitFailed && photoDraft && !removeExistingPhoto && <Button
            label={currentExistingPhotoUri ? 'Keep previous photo' : 'Continue without photo'}
            variant="secondary"
            onPress={() => void continueWithoutNewPhoto()}
            disabled={saving}
            testID="food-photo-continue"
          />}

        </>
      )}
    </Screen>
  );
}
