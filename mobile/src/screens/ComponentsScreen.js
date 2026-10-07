import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Card, Choice, NoteField, Screen, Slider, Stepper, useAppearance, useTheme } from '../design-system';

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
        <Stepper label="Amount" value={amount} min={0} max={24} onChange={setAmount} testID="preview-stepper" />
        <NoteField value={note} onChange={setNote} disabled={disabled || loading} testID="preview-note" />
      </Card>

      <Card style={{ backgroundColor: theme.colors.feedback.danger.bg, borderColor: theme.colors.feedback.danger.fg }}>
        <AppText variant="label" tone="danger">Error message</AppText>
        <AppText tone="danger">Could not save. Please try again.</AppText>
      </Card>
      <AppText variant="caption" tone="secondary">Component preview. No diary records are saved.</AppText>
    </Screen>
    {feedback > 0 && <View pointerEvents="none" role="status" accessibilityLiveRegion="polite" testID="preview-feedback" style={{ position: 'absolute', bottom: insets.bottom + theme.spacing.lg, left: theme.spacing.md, right: theme.spacing.md, alignItems: 'center' }}>
      <View style={{ maxWidth: theme.controls.contentWidth, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.feedback.success.fg, backgroundColor: theme.colors.feedback.success.bg }}><AppText variant="label" style={{ color: theme.colors.feedback.success.fg }}>Button pressed</AppText></View>
    </View>}
  </View>;
}
