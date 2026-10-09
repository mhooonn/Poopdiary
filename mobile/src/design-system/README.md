# Shared UI

Preview: **Profile → Developer tools → UI components**. Import from `src/design-system`. Colors, spacing, typography and control sizes live in `theme.js`.

| Need | Use |
| --- | --- |
| Screen / fixed save action | `Screen` with `footer` |
| Sections / text | `Card`, `FormSection`, `AppText` |
| Actions | `Button`, `IconButton` |
| One or several options | `Choice`, `ChoiceGroup` (`multiple`) |
| Drink selection | `DrinkChoice` (shared beverage colors) |
| Text / note / quantity | `TextField`, `NoteField`, `Stepper`, `Slider` |
| Record timestamp | `DateTimeField` + `DateTimeSheet` |
| Overlay / deletion | `Sheet`, `ConfirmSheet` |
| Loading / empty / error | `LoadingState`, `EmptyState`, `InlineNotice` |
| Home | `QuickLogCard`, `MetricCard`, `ProgressBar` |

## Date & time

Keep `date` as local `YYYY-MM-DD`, `time` as `HH:MM`. Convert to the feature's API contract only when saving. The sheet edits a draft: Cancel leaves the form unchanged; Done applies it.

```jsx
import { DateTimeField, DateTimeSheet } from '../design-system';

<DateTimeField date={date} time={time} onPress={() => setOpen(true)} />
<DateTimeSheet visible={open} date={date} time={time}
  onClose={() => setOpen(false)}
  onApply={(date, time) => {
    setDate(date); setTime(time); setOpen(false);
  }} />
```

Food's time is optional: pass `allowNoTime` and allow `time` to be `null`. Drinks PUT currently preserves its timestamp; agree on an API change before adding editable date/time to that form.

## Options and writes

```jsx
<ChoiceGroup label="Meal" value={meal} onChange={setMeal} columns={2}
  options={[{ value: 'breakfast', label: 'Breakfast' },
            { value: 'lunch', label: 'Lunch' }]} />
<TextField label="Food name" value={name} onChangeText={setName}
  helper="Example: porridge" error={error} reserveSupportingText />
<Button label="Save" onPress={save} loading={saving} disabled={!valid} />
```

The feature owns state, validation and API calls. Show success only after the API succeeds; keep the form and show `InlineNotice` on failure. Use stable option codes. Create and edit share one form.

`TextField` only reserves two helper/error lines when `reserveSupportingText` is set. Use it on fields where validation may appear after interaction.

## Layout rules

- Do not change size, border width, padding, typography or label wrapping on selection, press, focus or loading. Indicators have a reserved slot.
- Use at least 48px touch targets. Allow labels to wrap and test at 320px, 390px and larger text, in light/dark mode.
- Reuse these components before adding a feature-specific control. Add shared controls to the preview and run `npm run check`.
