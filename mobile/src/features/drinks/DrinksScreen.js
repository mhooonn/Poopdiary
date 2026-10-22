import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText, Button, Choice, NoteField, Screen, useTheme } from '../../design-system';
import { createDrink, getDrink, updateDrink } from '../../data/api';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { useWriteGuard } from '../../navigation/useWriteGuard';

/** @typedef {keyof import('../../design-system/theme').Theme['colors']['beverage']} DrinkType */

// Available drink types to choose from when adding a new drink entry
/** @type {{value:DrinkType,label:string}[]} */
const DRINK_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'tea', label: 'Tea' },
  { value: 'soda', label: 'Soda' },
  { value: 'juice', label: 'Juice' },
  { value: 'milk', label: 'Milk' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'custom', label: 'Other' },
];
// Amounts that the user can select instead of typing an amount
const PRESET_AMOUNTS_ML = [150, 250, 330, 500];

// Returns the date in YYYY-MM-DD. This format is used when saving a drink entry and selecting a diary date
export function localDate(d = new Date()) {
  /** @param {number} n */
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Converts an error into a message that can be displayed to the user
/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : 'Could not save the entry.';
}

// Form for creating a new drink entry or editing an existing one
// editId tells the form which entry should be loaded and updated
/** @param {{editId?:string}} props */
function DrinksForm({ editId }) {
  const theme = useTheme();
  const router = useRouter();
  const { notify } = useRecordFeedback();
  const [drinkType, setDrinkType] = useState(/** @type {DrinkType} */ ('water'));
  const [amount, setAmount] = useState('250');
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState(localDate());
  const [loading, setLoading] = useState(Boolean(editId));
  const [loaded, setLoaded] = useState(!editId);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const writing = useRef(false);

  // Prevents multiple write operations, such as saving the same entry twice
  useWriteGuard(saving, writing);

  // Tracks wheter the screen is still mounted. This helps avoid updating the screen after it has been removed
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Return to the diary after editing, or to the home screen after creating an entry
  const exit = () => {
    if (writing.current) return;
    if (editId) router.dismissTo({ pathname: '/diary', params: { date: recordDate } });
    else router.dismissTo('/');
  };

  // If editId exists, fetch the existing drink from the server
  useEffect(() => {
    if (!editId) return undefined;

    // Allows the request to be cancelled if the screen changes or unmounts
    const controller = new AbortController();
    async function load() {
      setLoading(true); setLoaded(false); setLoadError('');
      try {
        // Check that the entry ID is a valid positive integer before requesting it
        if (!/^[1-9]\d*$/.test(editId || '') || !Number.isSafeInteger(Number(editId))) throw new Error('Drink entry not found.');
        // Request the existing entry through the API
        const record = await getDrink(Number(editId), { signal: controller.signal });
        if (!controller.signal.aborted) {
          setDrinkType(record.drink_type);
          setAmount(String(record.amount_ml));
          setNote(record.note ?? '');
          setRecordDate(record.local_date);
          setLoaded(true);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(errorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [editId, attempt]);

  // Validate the form and send the data to the API
  async function onSave() {
    // Do not save while another write is running or while the entry is still loading
    if (writing.current || !loaded || loading || loadError !== '') return;
    // Convert the amount from text to a number and check that it is valid
    const amountMl = Number(amount);
    if (!Number.isSafeInteger(amountMl) || amountMl <= 0) {
      setError('Enter an amount greater than 0 ml.');
      return;
    }
    writing.current = true; 
    setSaving(true); 
    setError('');

    // Prepare the data in the format expected by the API
    const changes = {
      amount_ml: amountMl,
      drink_type: drinkType,
      note: note.trim() || null 
    };

    try {
      const now = new Date();
      // Use updateDrink and createDrink from data/api to create or update drink
      const saved = editId
        ? await updateDrink(Number(editId), changes)
        : await createDrink({ 
          ...changes, 
          logged_at: now.toISOString(), 
          local_date: localDate(now) 
        });

      if (mounted.current) {
        // Show feedback to the user after the API request succeeds
        notify(editId ? 'Changes saved' : 'Drink entry saved');

        // Return to the diary or home screen after saving
        if (editId) {
          router.dismissTo({ pathname: '/diary', params: { date: saved.local_date } });
        } else {
          router.dismissTo('/');
        }
      }
    } catch (failure) {
      // Display an error if the API request fails
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  // Shared layout styles for the drink type and amount choices
  /** @type {import('react-native').ViewStyle} */
  const gridStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm };
  /** @type {import('react-native').ViewStyle} */
  const cellStyle = { flexBasis: '47%', flexGrow: 1 };

  // Returns form for adding or editing a drink
  return <Screen title={editId ? 'Edit drink' : 'Drinks'} onBack={exit} testID="drinks-screen">
    {loading ? <AppText tone="secondary">Loading drink entry…</AppText> : !loaded ? <>

      {/* Show a loading error and let the user try the request again */}
      <AppText tone="danger" accessibilityLiveRegion="polite" testID="drink-load-error">{loadError}</AppText>
      <Button 
        label="Retry" 
        variant="secondary" 
        onPress={() => setAttempt((value) => value + 1)} 
      />
    </> : <>
    {/* Drink type choices update drinkType, which is included in the saved data */}
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Drink</AppText>
        <View style={gridStyle}>
          {DRINK_TYPES.map((type) => <Choice 
          key={type.value} 
          label={type.label} 
          selected={drinkType === type.value}
          onPress={() => setDrinkType(type.value)} 
          disabled={saving} 
          density="compact" 
          style={cellStyle}
          icon={<View style={{ 
            width: theme.controls.smallIcon, 
            height: theme.controls.smallIcon, 
            borderRadius: theme.radius.pill, 
            backgroundColor: theme.colors.beverage[type.value].fg 
          }} />}
            testID={`drink-${type.value}`} />)}
        </View>
      </View>

      {/* Preset buttons and the text input both update the amount state */}
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Amount</AppText>
        <View style={gridStyle}>
          {PRESET_AMOUNTS_ML.map((ml) => <Choice 
          key={ml} label={`${ml} ml`} 
          selected={amount === String(ml)} 
          onPress={() => setAmount(String(ml))}
          disabled={saving} 
          density="compact" 
          style={cellStyle} 
          testID={`amount-${ml}`} 
          />)}
        </View>

        {/* Keep the amount as text while editing; convert it to a number when saving */}
        <TextInput 
          value={amount} 
          onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))} 
          editable={!saving}
          placeholder="Custom amount (ml)" 
          placeholderTextColor={theme.colors.text.secondary} 
          keyboardType="number-pad"
          accessibilityLabel="Drink amount in ml" 
          testID="drink-amount" 
          maxLength={8}
          style={{ 
            ...theme.typography.body, 
            minHeight: theme.controls.minimumTouchTarget, 
            padding: theme.spacing.md,
            borderRadius: theme.radius.md, 
            borderWidth: theme.controls.borderWidth, 
            borderColor: theme.colors.border.control,
            backgroundColor: theme.colors.surface.card, 
            color: theme.colors.text.primary
          }} />
      </View>

      {/* NoteField updates note, which is included in the API request when saving */}
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Note</AppText>
        <NoteField value={note} onChange={setNote} disabled={saving} testID="drink-note" />
      </View>
      {error !== '' && <AppText tone="danger" accessibilityLiveRegion="polite" testID="drink-save-error">{error}</AppText>}

      {/* Calls onSave to create a new entry or update an existing one */}
      <Button 
      label={editId ? 'Save changes' : 'Save entry'} 
      onPress={() => void onSave()} 
      loading={saving} 
      disabled={saving} 
      testID="drink-save"
      />
    </>}
  </Screen>;
}

export function DrinksScreen() {
  const { edit } = useLocalSearchParams();
  const editId = typeof edit === 'string' ? edit : undefined;
  return <DrinksForm key={editId ?? 'new'} editId={editId} />;
}
