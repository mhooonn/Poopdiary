// FoodFormScreen
// Form screen for logging a new food entry or editing an existing one.
// Create mode:  /food
// Edit mode:    /food?edit=ID  (opened from the Diary)
//
// The food details (name, meal, date, time, notes) are saved to the backend.
// The optional meal photo is stored only on this device (foodPhotoStore),
// so saving happens in two steps: 1) backend, 2) local photo.

import { useEffect, useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';

// Shared UI components from our design system
import {
  AppText,
  Button,
  Card,
  Choice,
  NoteField,
  Screen,
  useTheme,
} from '../../design-system';

// Backend API functions: create, fetch all, update
import { createFood, listFood, updateFood } from '../../data/api';
// Shows the "saved" message (toast) on the next screen after we navigate away
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
// Hook that protects the screen from being left while a save is in progress
import { useWriteGuard } from '../../navigation/useWriteGuard';
// Photo UI component and the local storage for meal photos
import { FoodPhotoField } from './components/FoodPhotoField';
import { foodPhotoStore } from './photoStore';

/** @typedef {{id:number,food_name:string,meal_type:string|null,date:string,time:string|null,notes:string|null}} FoodRecord */

// Meal type options shown as choices
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Current local date in YYYY-MM-DD
// (getMonth() starts from 0, so we add 1; padStart makes "5" into "05")
function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function FoodFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { notify } = useRecordFeedback();

  // The ?edit=ID value from the URL. URL params can be string, array or
  // undefined, so we only accept a string and otherwise use ''.
  const editParam = typeof params.edit === 'string' ? params.edit : '';

  // ---- Form field state (with default values for a new entry) ----
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState(/** @type {string|null} */ ('Breakfast'));
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(currentTime()); // time is optional, so it can be emptied
  const [notes, setNotes] = useState('');

  // ---- Photo state ----
  // New photo taken in this session but not yet saved (a "draft" file on the device)
  const [photoDraft, setPhotoDraft] = useState(/** @type {{name:string,uri:string}|null} */ (null));
  // Photo that was already saved for the entry we are editing
  const [existingPhotoUri, setExistingPhotoUri] = useState(/** @type {string|null} */ (null));
  // Which record the existingPhotoUri belongs to (prevents showing a photo of another entry)
  const [photoRecordId, setPhotoRecordId] = useState(/** @type {number|null} */ (null));
  const [photoBusy, setPhotoBusy] = useState(false); // camera or file operation running
  const [photoError, setPhotoError] = useState(''); // photo-related error message
  const [cameraSettingsRequired, setCameraSettingsRequired] = useState(false); // permission was denied permanently, so show "open settings"
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false); // user wants the old photo deleted on save
  // Set when the backend save worked but the photo step failed.
  // It lets the user retry just the photo without creating a duplicate entry.
  const [savedFoodId, setSavedFoodId] = useState(/** @type {number|null} */ (null));
  const [photoCommitFailed, setPhotoCommitFailed] = useState(false);

  // Id of the record being edited. null means we are creating a new one.
  const [editingId, setEditingId] = useState(
    /** @type {number|null} */ (null)
  );

  // ---- UI state ----
  const [saving, setSaving] = useState(false); // true while the save runs
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editParam)); // true while fetching the entry to edit
  const [error, setError] = useState(''); // save/validation error
  const [loadError, setLoadError] = useState(''); // error when loading the entry to edit
  const [loadAttempt, setLoadAttempt] = useState(0); // increased by the Retry button to reload
  // The date the entry had when it was loaded. Used to return to the right
  // day in the Diary if the user cancels the edit.
  const [recordDate, setRecordDate] = useState(today());

  // A ref (not state) tracking an in-progress save. Refs update immediately,
  // so a fast double tap on Save can't start two saves.
  const writing = useRef(false);
  useWriteGuard(saving, writing);

  // Tracks whether the screen is still on screen. After an async call we
  // check this so we don't update state on an unmounted component.
  const mounted = useRef(true);
  // A ref copy of photoDraft so cleanup code and async functions always see the latest value
  const photoDraftRef = useRef(/** @type {{name:string,uri:string}|null} */ (null));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // When the screen closes, delete any unsaved draft photo so no
  // unused files are left on the device
  useEffect(() => () => {
    const draft = photoDraftRef.current;
    if (draft) void foodPhotoStore.discardDraft(draft.name).catch(() => undefined);
  }, []);

  const editing = editParam !== '';
  // Only show the existing photo if it belongs to the entry being edited
  const currentExistingPhotoUri = photoRecordId === editingId ? existingPhotoUri : null;
  // True while the saved photo of the edited entry is still being loaded
  const photoLoading = editingId !== null && photoRecordId !== editingId;

  // Back button handler: do nothing while saving or while a photo retry is
  // pending; otherwise go back to the Diary (on the entry's day) when
  // editing, or to the home screen when creating.
  const exit = () => {
    if (writing.current || savedFoodId !== null) return;
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDate } });
    else router.dismissTo('/');
  };

  // Fills the form with the values of an existing record
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

  // When we know which entry is edited, load its saved photo from the device
  useEffect(() => {
    // Create mode, nothing to load
    if (editingId === null) return undefined;

    // Ignore the result if the effect has been cleaned up before it finishes
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

  // On Android the system can kill our app while the camera is open.
  // When the app restarts, this recovers the photo that was just taken
  // so it isn't lost. Not needed on web.
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let active = true;
    void ImagePicker.getPendingResultAsync().then((result) => {
      if (!active || !result) return;
      if ('canceled' in result && !result.canceled && result.assets?.[0]) {
        // A photo was waiting, so save it as a draft
        void savePickedPhoto(result.assets[0]);
      } else if (!('canceled' in result)) {
        // The result was an error
        setPhotoError('The camera could not return the meal photo. Try again.');
      }
    }).catch(() => {
      if (active) setPhotoError('The camera could not return the meal photo. Try again.');
    });
    return () => { active = false; };
  }, []);

  // Saves a photo from the camera as a draft file on the device.
  // It is not linked to a food entry until the form is saved.
  /** @param {import('expo-image-picker').ImagePickerAsset} asset */
  async function savePickedPhoto(asset) {
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const name = await foodPhotoStore.saveDraft(asset.uri, asset.width, asset.height);
      const draft = { name, uri: foodPhotoStore.draftUri(name) };
      // Screen closed while saving: delete the draft instead of keeping it
      if (!mounted.current) {
        await foodPhotoStore.discardDraft(name);
        return;
      }
      // Replace the previous draft (if any) with the new one
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

  // Opens the camera: checks / asks for permission, takes the photo
  // and passes it on to savePickedPhoto
  async function takePhoto() {
    // Ignore taps while something else is running
    if (photoBusy || saving || savedFoodId !== null) return;
    setPhotoBusy(true);
    setPhotoError('');
    setCameraSettingsRequired(false);
    try {
      // The web version has no camera permission step here
      if (Platform.OS !== 'web') {
        // Ask for permission only if we don't have it yet
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          // canAskAgain false means the user must enable it in system settings
          setCameraSettingsRequired(!permission.canAskAgain);
          setPhotoError('Camera access is off. Allow it to take a meal photo.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], cameraType: ImagePicker.CameraType.back, allowsEditing: false, quality: 0.9, exif: false });
      // If the user cancelled the camera there is nothing to save
      if (!result.canceled && result.assets?.[0]) await savePickedPhoto(result.assets[0]);
    } catch (failure) {
      setPhotoError(errorMessage(failure));
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  }

  // Opens the app's page in the phone settings (for enabling the camera)
  async function openCameraSettings() {
    try {
      await Linking.openSettings();
    } catch {
      setPhotoError('Could not open app settings. Open camera permissions from your device settings.');
    }
  }

  // Remove button for the photo.
  // If there is a new draft, delete it right away.
  // If only the saved photo exists, mark it for removal (deleted when the form is saved).
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

  // Applies the photo changes to the saved entry:
  //  - a draft photo is attached to the entry
  //  - or the old photo is deleted if the user removed it
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

  // Final step after a successful save: show the message and leave the form
  /** @param {string} recordDateValue */
  function finishSave(recordDateValue) {
    if (!mounted.current) return;
    notify(editing ? 'Changes saved' : 'Food entry saved');
    if (editing) router.dismissTo({ pathname: '/diary', params: { date: recordDateValue } });
    else router.dismissTo('/');
  }

  // Used when the photo step failed: the user gives up on the new photo.
  // The entry is already saved, so we delete the draft and leave.
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
    // Create mode, nothing to load
    if (!editParam) return;

    // AbortController lets us cancel the request if the screen closes
    // or the id changes while it is still running
    const controller = new AbortController();

    async function loadEntry() {
      setLoadingEdit(true);
      setLoadError('');
      setEditingId(null);

      try {
        // Validate the id from the URL: it must be a positive whole number
        if (!/^[1-9]\d*$/.test(editParam) || !Number.isSafeInteger(Number(editParam))) throw new Error('Food entry not found.');
        // The API gives us all entries, so we find the right one by id
        const records = await listFood({ signal: controller.signal });
        const record = records.find(
          (item) => item.id === Number(editParam)
        );

        if (!record) {
          throw new Error('Food entry not found.');
        }

        // Fill the form with the saved values (unless the request was cancelled)
        if (!controller.signal.aborted) startEditing(record);
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(errorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoadingEdit(false);
      }
    }

    void loadEntry();

    // Cleanup: cancel the request
    return () => {
      controller.abort();
    };
  }, [editParam, loadAttempt]); // loadAttempt changes when Retry is pressed

  // Validates the form, saves the entry to the backend and then
  // stores the photo on the device
  async function handleSave() {
    // Ignore taps while already saving, or while the entry to edit is not ready
    if (writing.current || (editing && (loadingEdit || loadError !== '' || editingId === null))) return;
    setError('');

    // Retry mode: the entry was already saved earlier but the photo step failed.
    // Only the photo is retried here, so we don't create the entry twice.
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

    // ---- Validation: stop at the first problem and show a message ----
    if (!foodName.trim()) {
      setError('Please enter a food name.');
      return;
    }

    // Check that the date is in YYYY-MM-DD format AND is a real calendar date.
    // Noon is used so time zone shifts can't change the day.
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

    // Time is optional: an empty value is fine, otherwise it must be HH:MM (00:00 - 23:59)
    if (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Enter a valid time in HH:MM format.');
      return;
    }

    // The object sent to the backend (no photo, it stays on the device)
    const food = {
      foodName: foodName.trim(),
      mealType,
      date,
      time: time || null, // empty time is stored as null
      notes: notes.trim(),
    };

    // Lock the form while the request is running
    writing.current = true;
    setSaving(true);

    try {
      // Step 1: save the details to the backend (update if we have an id, otherwise create)
      const response = editingId !== null
        ? await updateFood(editingId, food)
        : await createFood(food);

      // Step 2: store / remove the photo on this device
      try {
        await syncLocalPhoto(response.id);
      } catch {
        // The entry exists in the backend but the photo failed. Remember the
        // id and stay on the screen so the user can retry the photo.
        setSavedFoodId(response.id);
        setPhotoCommitFailed(true);
        setPhotoError(photoDraftRef.current
          ? 'Food details were saved, but the meal photo could not be stored on this device. Try again.'
          : 'Food details were saved, but the photo could not be removed from this device. Try again.');
        return;
      }

      // Both steps succeeded
      finishSave(date);
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      // Always unlock, even if the save failed
      writing.current = false;
      if (mounted.current) setSaving(false);
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
      title={editing ? 'Edit food' : 'Log food'}
      onBack={exit}
      testID="food-form"
    >
      {/* While the entry to edit is loading (or failed to load), show only
          the loading text or the error with a Retry button */}
      {editing && (loadingEdit || editingId === null) ? (
        loadError !== '' ? <>
          <AppText tone="danger" accessibilityLiveRegion="polite">{loadError}</AppText>
          <Button label="Retry" variant="secondary" onPress={() => setLoadAttempt((value) => value + 1)} />
        </> :
        <AppText tone="secondary">Loading food entry...</AppText>
      ) : (
        <>
          {/* Food name (required). The inputs are locked while saving and
              after the details were already saved. */}
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

          {/* Meal photo field, shown only on phones (the camera is not used on web).
              Shows the new draft, else the saved photo (unless marked for removal). */}
          {Platform.OS !== 'web' && <FoodPhotoField
            uri={photoDraft?.uri ?? (removeExistingPhoto ? null : currentExistingPhotoUri)}
            loading={photoLoading}
            busy={photoBusy || saving || savedFoodId !== null}
            actionLoading={photoBusy}
            error={photoError}
            settingsRequired={cameraSettingsRequired}
            onTakePhoto={() => void takePhoto()}
            onRemove={() => void removePhoto()}
            onOpenSettings={() => void openCameraSettings()}
          />}

          {/* Meal type: one choice can be selected at a time */}
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

          {/* Date as text; maxLength 10 fits YYYY-MM-DD */}
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

          {/* Time as text (optional); maxLength 5 fits HH:MM */}
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

          {/* Optional free-text notes */}
          <Card>
            <AppText variant="label">Notes (optional)</AppText>

            <NoteField
              value={notes}
              onChange={setNotes}
              testID="food-notes"
              disabled={saving || savedFoodId !== null}
            />
          </Card>

          {/* Validation or server error. accessibilityLiveRegion makes
              screen readers announce it when it appears. */}
          {error !== '' && (
            <AppText tone="danger" accessibilityLiveRegion="polite" testID="food-save-error">{error}</AppText>
          )}

          {/* The label changes depending on the situation:
              retry (photo failed), edit, or new entry */}
          <Button
            label={savedFoodId !== null ? 'Retry photo save' : (editing ? 'Save changes' : 'Save food')}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving || photoBusy || photoLoading}
            testID="food-save"
          />

          {/* Shown only after the photo step failed: lets the user skip
              the photo and leave, since the entry itself is already saved */}
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