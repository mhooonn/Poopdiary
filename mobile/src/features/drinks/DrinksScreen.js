import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppText } from '../../design-system/components/AppText';
import { Choice } from '../../design-system/components/Choice';
import { useTheme } from '../../design-system/ThemeProvider';
import { Screen } from '../../design-system';
import { useBack } from '../../navigation/useBack';
import { apiBaseUrl } from '../../config/api';

/** @typedef {keyof import('../../design-system/theme').Theme['colors']['beverage']} DrinkType */

/** @type {{ value: DrinkType, label: string }[]} */
// Arvot vastaavat teeman beverage-värien avaimia (theme.colors.beverage).
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

 console.log('apiBaseUrl:', apiBaseUrl);

const PRESET_AMOUNTS_ML = [150, 250, 330, 500];

export function localDate(d = new Date()) {
    /** @param {number} n */
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * @typedef {Object} DrinkEntry
 * @property {number} amount_ml
 * @property {DrinkType} drink_type
 * @property {string | null} note
 * @property {string} logged_at
 * @property {string} local_date
 */

/** @param {DrinkEntry} entry */
async function postDrink(entry) {
  console.log("POST /drinks – sending:", entry);

  const response = await fetch(`${apiBaseUrl}/drinks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });

  console.log("POST /drinks – status:", response.status);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data; // palvelimen tallentama rivi, jossa on myös id
}

/** @param {string} id */
async function getDrink(id) {
    console.log('GET drink, id:', id, 'url:', `${apiBaseUrl}/drinks/${id}`);
  const response = await fetch(`${apiBaseUrl}/drinks/${id}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * @param {number} id
 * @param {{ amount_ml: number, drink_type: DrinkType, note: string | null }} changes
 */
export async function updateDrink(id, changes) {
    console.log('PUT drink, id:', id);
  const response = await fetch(`${apiBaseUrl}/drinks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/** @param {number} id */
export async function deleteDrink(id) {
  const response = await fetch(`${apiBaseUrl}/drinks/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
}

/**
 * @typedef {Object} TextFieldProps
 * @property {string} value
 * @property {(text: string) => void} onChangeText
 * @property {string} [placeholder]
 * @property {import('react-native').KeyboardTypeOptions} [keyboardType]
 */

/** @param {TextFieldProps} props */
function TextField({ value, onChangeText, placeholder, keyboardType }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.text.secondary}
      keyboardType={keyboardType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        minHeight: theme.controls.minimumTouchTarget,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: focused ? theme.controls.selectedBorderWidth : theme.controls.borderWidth,
        borderColor: focused ? theme.colors.focus : theme.colors.border.control,
        backgroundColor: theme.colors.surface.card,
        color: theme.colors.text.primary,
        fontSize: theme.typography.body.fontSize,
      }}
    />
  );
}

/** @param {{ editId?: string }} props */
function DrinksForm({ editId }) {
  const theme = useTheme();
  const goBack = useBack();
  const [drinkType, setDrinkType] = useState(/** @type {DrinkType} */ ('water'));
  const [amount, setAmount] = useState('250');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!editId) return;
    getDrink(editId)
      .then((d) => {
        setDrinkType(d.drink_type);
        setAmount(String(d.amount_ml));
        setNote(d.note ?? '');
      })
      .catch((e) => Alert.alert('Error', e.message));
  }, [editId]);

  

  async function onSave() {
    const amountMl = parseInt(amount, 10);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      Alert.alert('Check amount', 'Enter an amount greater than 0 ml.');
      return;
    }
    const cleanNote = note.trim() || null;

    try {
      if (editId) {
        await updateDrink(Number(editId), {
          amount_ml: amountMl,
          drink_type: drinkType,
          note: cleanNote,
        });
      } else {
        const now = new Date();
        await postDrink({
          amount_ml: amountMl,
          drink_type: drinkType,
          logged_at: now.toISOString(),
          local_date: localDate(now),
          note: cleanNote,
        });
      }
      goBack(); // takaisin Diaryyn
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not save the entry.');
    }
  }

  function onDelete() {
  Alert.alert('Delete entry', 'Do you want to delete this drink?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await deleteDrink(Number(editId));
          goBack();
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Could not delete the entry.');
        }
      },
    },
  ]);
}

  /** @type {import('react-native').ViewStyle} */
  const gridStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm };
  /** @type {import('react-native').ViewStyle} */
  const cellStyle = { flexBasis: '47%', flexGrow: 1 };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.surface.canvas }}
      contentContainerStyle={{
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
        width: '100%',
        maxWidth: theme.controls.contentWidth,
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Drink</AppText>
        <View style={gridStyle}>
          {DRINK_TYPES.map((t) => {
            const colors = theme.colors.beverage[t.value];
            return (
              <Choice
                key={t.value}
                label={t.label}
                selected={drinkType === t.value}
                onPress={() => setDrinkType(t.value)}
                density="compact"
                style={cellStyle}
                icon={
                  <View
                    style={{
                      width: theme.controls.smallIcon,
                      height: theme.controls.smallIcon,
                      borderRadius: theme.radius.pill,
                      backgroundColor: colors.fg,
                    }}
                  />
                }
                testID={`drink-${t.value}`}
              />
            );
          })}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Amount</AppText>
        <View style={gridStyle}>
          {PRESET_AMOUNTS_ML.map((ml) => (
            <Choice
              key={ml}
              label={`${ml} ml`}
              selected={amount === String(ml)}
              onPress={() => setAmount(String(ml))}
              density="compact"
              style={cellStyle}
              testID={`amount-${ml}`}
            />
          ))}
        </View>
        <TextField
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
          placeholder="Custom amount (ml)"
          keyboardType="number-pad"
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle">Note</AppText>
        <TextField value={note} onChangeText={setNote} placeholder="Optional, e.g. after workout" />
      </View>

      <Pressable
        onPress={onSave}
        accessibilityRole="button"
        accessibilityLabel="Save entry"
        style={({ pressed }) => ({
          minHeight: theme.controls.minimumTouchTarget,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed
            ? theme.colors.action.primary.pressed
            : theme.colors.action.primary.background,
        })}
      >
        <AppText variant="label" style={{ color: theme.colors.action.primary.foreground }}>
          Save entry
        </AppText>
      </Pressable>

    {editId ? (
    <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete entry"
        style={({ pressed }) => ({
        minHeight: theme.controls.minimumTouchTarget,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed
            ? theme.colors.action.danger.pressed
            : theme.colors.action.danger.background,
        })}
    >
        <AppText variant="label" style={{ color: theme.colors.action.danger.foreground }}>
        Delete entry
        </AppText>
    </Pressable>
    ) : null}

    </ScrollView>
  );
}

export function DrinksScreen() {
  const goBack = useBack();
  const { edit } = useLocalSearchParams();
  const editId = typeof edit === 'string' ? edit : undefined;

  return (
    <Screen title={editId ? 'Edit drink' : 'Drinks'} onBack={goBack} scroll={false} testID="drinks-screen">
      <DrinksForm key={editId ?? 'new'} editId={editId} />
    </Screen>
  );
}