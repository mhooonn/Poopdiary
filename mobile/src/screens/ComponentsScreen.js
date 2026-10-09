import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Card, Choice, ChoiceGroup, ConfirmSheet, DateTimeField, DateTimeSheet, DrinkChoice, EmptyState, FormSection, InlineNotice, LoadingState, MetricCard, NoteField, ProgressBar, QuickLogCard, Screen, Slider, Stepper, TextField, useAppearance, useTheme } from '../design-system';
import { formatDate, formatTime } from '../shared/dateTime';

const appearances = /** @type {const} */ (['light', 'dark', 'system']);
const severities = /** @type {const} */ (['mild', 'moderate', 'severe']);

/** A working UI reference for the team, separate from future diary features. */
/** @param {{onBack?: () => void}} props */
export function ComponentsScreen({ onBack } = {}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { appearance, setAppearance } = useAppearance();
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [selected, setSelected] = useState(false);
  const [severity, setSeverity] = useState(/** @type {'mild' | 'moderate' | 'severe'} */ ('mild'));
  const [tile, setTile] = useState('food');
  const [feedback, setFeedback] = useState(0);
  const [level, setLevel] = useState(4);
  const [amount, setAmount] = useState(7);
  const [note, setNote] = useState('');
  const [textValue, setTextValue] = useState('Example text');
  const [date, setDate] = useState(formatDate(new Date()));
  const [time, setTime] = useState(formatTime(new Date()));
  const [optionalTime, setOptionalTime] = useState(/** @type {string|null} */ (null));
  const [optionalTimeOpen, setOptionalTimeOpen] = useState(false);
  const [dateTimeOpen, setDateTimeOpen] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const [meal, setMeal] = useState('breakfast');
  const [symptoms, setSymptoms] = useState(/** @type {string[]} */ ([]));
  const [drink, setDrink] = useState(/** @type {'water'|'coffee'|'tea'|'soda'} */ ('water'));
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(0), 1800);
    return () => clearTimeout(timer);
  }, [feedback]);

  const previewAction = () => setFeedback((action) => action + 1);
  const palette = [
    { name: 'Canvas', bg: theme.colors.surface.canvas, fg: theme.colors.text.primary },
    { name: 'Card', bg: theme.colors.surface.card, fg: theme.colors.text.primary },
    { name: 'Primary', bg: theme.colors.action.primary.background, fg: theme.colors.action.primary.foreground },
    { name: 'Accent', ...theme.colors.entry.symptom },
    { name: 'Water', ...theme.colors.beverage.water },
    { name: 'Coffee', ...theme.colors.beverage.coffee },
    { name: 'Tea', ...theme.colors.beverage.tea },
  ];

  return <View style={{ flex: 1, backgroundColor: theme.colors.surface.canvas }}>
    <Screen title="UI components" onBack={onBack} testID="components-screen">
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle" accessibilityRole="header">Appearance</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {appearances.map((value) => <View key={value} style={{ flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 2 }}>
            <Choice label={value === 'light' ? 'Light' : value === 'dark' ? 'Dark' : 'System'} density="compact" selected={appearance === value} onPress={() => setAppearance(value)} testID={`appearance-${value}`} />
          </View>)}
        </View>
      </View>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Colors</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {palette.map(({ name, bg, fg }) => <View key={name} testID={`color-${name.toLowerCase()}`} style={{ flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 2.4, minHeight: theme.controls.minimumTouchTarget * 1.5, padding: theme.spacing.sm, gap: theme.spacing.xs, borderRadius: theme.radius.sm, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.control, backgroundColor: bg, justifyContent: 'center' }}>
            <AppText variant="label" style={{ color: fg }}>{name}</AppText>
          </View>)}
        </View>
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Typography</AppText>
        <AppText variant="pageTitle">Page title</AppText>
        <AppText variant="sectionTitle">Section title</AppText>
        <AppText>Body text</AppText>
        <AppText variant="label">Label</AppText>
        <AppText variant="caption" tone="secondary">Supporting text</AppText>
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Buttons</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {/** @type {const} */ (['primary', 'secondary', 'danger', 'text']).map((variant) => <View key={variant} style={{ flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 2.5 }}>
            <Button label={{ primary: 'Save', secondary: 'Edit', danger: 'Delete', text: 'Cancel' }[variant]} variant={variant} onPress={previewAction} testID={`button-${variant}`} />
          </View>)}
        </View>
        <Choice label="Loading" selected={loading} selectionRole="checkbox" density="compact" onPress={() => setLoading(!loading)} testID="toggle-loading" />
        <Choice label="Disabled" selected={disabled} selectionRole="checkbox" density="compact" onPress={() => setDisabled(!disabled)} testID="toggle-disabled" />
        <Button label="Preview action" onPress={previewAction} loading={loading} disabled={disabled} testID="button-interactive" />
        <Button label="Action with an icon" icon={<AppText variant="label">+</AppText>} variant="secondary" onPress={previewAction} loading={loading} disabled={disabled} testID="button-with-icon" />
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Choices</AppText>
        <Choice label="Long option" description="Longer descriptions should remain readable when text size is increased." selected={selected} selectionRole="checkbox" onPress={() => setSelected(!selected)} testID="choice-long" />
        <Choice label="Unavailable option" disabled onPress={() => undefined} testID="choice-disabled" />
        <View accessibilityRole="radiogroup" accessibilityLabel="Severity" style={{ gap: theme.spacing.sm }}>
          {severities.map((value) => <Choice key={value} label={value === 'mild' ? 'Mild' : value === 'moderate' ? 'Moderate' : 'Severe'} tone={value} selected={severity === value} onPress={() => setSeverity(value)} testID={`choice-${value}`} />)}
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Tile options" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {['food', 'bowel', 'water'].map((value, index) => <View key={value} style={{ flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 2 }}><Choice label={{ food: 'Food', bowel: 'Bowel', water: 'Drinks' }[value] ?? value} layout="tile" badge={String(index + 1)} selected={tile === value} onPress={() => setTile(value)} testID={`tile-${value}`} /></View>)}
        </View>
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Inputs</AppText>
        <Slider label="Level" value={level} onChange={setLevel} disabled={disabled || loading} testID="preview-slider" />
        <Stepper label="Amount" value={amount} min={0} max={24} onChange={setAmount} disabled={disabled || loading} testID="preview-stepper" />
        <NoteField value={note} onChange={setNote} disabled={disabled || loading} testID="preview-note" />
        <TextField label="Food name" value={textValue} onChangeText={setTextValue} placeholder="Type something" helper="Example: porridge" error={fieldError ? 'Enter a food name' : undefined} disabled={disabled || loading} testID="preview-text-field" />
        <Choice label="Show field error" selectionRole="checkbox" selected={fieldError} onPress={() => setFieldError(!fieldError)} density="compact" testID="preview-field-error" />
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Option groups</AppText>
        <AppText variant="label">Meal</AppText>
        <ChoiceGroup label="Meal" value={meal} onChange={setMeal} columns={2} disabled={disabled}
          options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' }]} testID="preview-meal" />
        <AppText variant="label">Symptoms · multiple selection</AppText>
        <ChoiceGroup label="Symptoms" value={symptoms} onChange={setSymptoms} multiple columns={2} disabled={disabled}
          options={[{ value: 'bloating', label: 'Bloating' }, { value: 'pain', label: 'Abdominal pain' }, { value: 'nausea', label: 'Nausea' }, { value: 'urgency', label: 'Urgency' }]} testID="preview-symptoms" />
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Drinks</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Drink" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {/** @type {const} */ (['water', 'coffee', 'tea', 'soda']).map((type) => <View key={type} style={{ flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 2.5 }}>
            <DrinkChoice type={type} label={{ water: 'Water', coffee: 'Coffee', tea: 'Tea', soda: 'Soft drink' }[type]} selected={drink === type} onPress={() => setDrink(type)} disabled={disabled} testID={`preview-drink-${type}`} />
          </View>)}
        </View>
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Shared record patterns</AppText>
        <FormSection title="Date & time">
          <DateTimeField date={date} time={time} onPress={() => setDateTimeOpen(true)} testID="preview-date-time" />
        </FormSection>
        <FormSection title="Optional time · Food">
          <DateTimeField date={date} time={optionalTime} onPress={() => setOptionalTimeOpen(true)} testID="preview-optional-time" />
        </FormSection>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <QuickLogCard label="Food" tone="food" icon={<AppText>🍽️</AppText>} onPress={previewAction} testID="preview-quick-food" />
          <QuickLogCard label="Bowel" tone="bowel" icon={<AppText>●</AppText>} onPress={previewAction} testID="preview-quick-bowel" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <MetricCard label="Food" value={2} unit="entries" tone="food" icon={<AppText>•</AppText>} testID="preview-metric-food" />
          <MetricCard label="Water" value={750} unit="ml" tone="water" icon={<AppText>•</AppText>} testID="preview-metric-water" />
        </View>
        <ProgressBar value={750} max={2000} tone="water" testID="preview-progress" />
      </Card>

      <Card>
        <AppText variant="sectionTitle" accessibilityRole="header">Feedback & sheets</AppText>
        <InlineNotice title="Could not save" message="Your changes are still here." actionLabel="Retry" onAction={previewAction} testID="preview-error" />
        <InlineNotice title="Saved" tone="success" testID="preview-success" />
        <LoadingState label="Loading entries" testID="preview-loading" />
        <EmptyState title="No entries yet" actionLabel="Add an entry" onAction={previewAction} testID="preview-empty" />
        <Button label="Preview delete confirmation" variant="secondary" onPress={() => setConfirmOpen(true)} testID="preview-open-confirm" />
      </Card>
      <AppText variant="caption" tone="secondary">Component preview. No diary records are saved.</AppText>
    </Screen>
    <DateTimeSheet testIDPrefix="preview-date-time" visible={dateTimeOpen} date={date} time={time} onClose={() => setDateTimeOpen(false)} onApply={(nextDate, nextTime) => { setDate(nextDate); setTime(nextTime); setDateTimeOpen(false); }} />
    <DateTimeSheet testIDPrefix="preview-optional-time" visible={optionalTimeOpen} allowNoTime date={date} time={optionalTime} onClose={() => setOptionalTimeOpen(false)} onApply={(nextDate, nextTime) => { setDate(nextDate); setOptionalTime(nextTime); setOptionalTimeOpen(false); }} />
    <ConfirmSheet visible={confirmOpen} title="Delete entry?" message="This is a preview. No diary entries will be deleted." onClose={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); previewAction(); }} testID="preview-confirm-delete" />
    {feedback > 0 && <View pointerEvents="none" role="status" accessibilityLiveRegion="polite" testID="preview-feedback" style={{ position: 'absolute', bottom: insets.bottom + theme.spacing.lg, left: theme.spacing.md, right: theme.spacing.md, alignItems: 'center' }}>
      <View style={{ maxWidth: theme.controls.contentWidth, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.feedback.success.fg, backgroundColor: theme.colors.feedback.success.bg }}><AppText variant="label" style={{ color: theme.colors.feedback.success.fg }}>Button pressed</AppText></View>
    </View>}
  </View>;
}
