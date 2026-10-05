# Poop Diary mobile

Expo / React Native, using JavaScript. This starter displays the shared UI components; it does not save diary records or call the backend yet.

Application source stays JavaScript; TypeScript is used only as a development checker through `checkJs`.

## Run

From this directory:

```sh
npm ci
npm start -- --go
```

Open the QR code with Expo Go on a phone connected to the same Wi-Fi. For a browser preview, run `npm run web`. Stop Metro before reinstalling dependencies.

## Shared UI

```text
src/design-system/
  theme.js                 Colors, typography, spacing and component sizes
  ThemeProvider.js         Light / dark / system appearance
  components/              AppText, Button, Card, Choice, Screen
  index.js                 Public imports
src/screens/
  ComponentsScreen.js      Interactive component preview
```

Use these components and theme tokens in feature screens. Adjust shared values in `theme.js` instead of creating separate palettes or copying styles into each feature.

```jsx
import { View } from 'react-native';
import { Button, useTheme } from '../design-system';

function SaveExample({ onSave }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Button label="Save" onPress={onSave} />
    </View>
  );
}
```

The preview shows both themes and control states. It is a development reference, not the final app navigation.

## UI rules

- Use semantic theme colors and shared typography, spacing and sizes.
- Selected, pressed, focused, disabled and loading states must preserve a control's size, position and label wrapping. Reserve space for indicators; keep border widths fixed.
- Keep touch targets at least 48 logical pixels. Support native font scaling and long labels without clipping them.
- Keep new components reusable; feature-specific data and API calls belong outside the design system.

## Check

```sh
npm run check
```

This runs ESLint, JavaScript type checks and tests. Also check changed screens on a phone: web checks do not prove Android or iOS layout.

For bundle checks, use `npm run export:web` or `npm run export:native`.

GitHub Actions runs these checks, dependency compatibility checks and web/Android/iOS exports for mobile changes.

Keep changes in small PRs so another teammate can run and review them.
