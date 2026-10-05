# Poop Diary mobile

Expo / React Native with JavaScript. The app currently provides the original navigation and empty screens for the team to build. TypeScript is a development checker (`checkJs`); application source stays JavaScript.

## Run

```sh
npm ci
npm start -- --go
```

Scan with Expo Go on the same Wi-Fi. For a browser, use `npm run web`. Stop Metro before reinstalling dependencies.

## Structure

```text
src/app/              Thin Expo Router routes and layouts
src/navigation/       Floating dock, Log menu and empty page scaffold
src/screens/          Screen content, including Developer tools
src/design-system/    Shared theme and components
src/config/           Public app configuration
src/data/api/         Read-only backend client
```

Main tabs are Today, Diary, Insights and Profile. Log opens six empty editors. Product pages contain no mock records or feature UI. Add screen content separately; keep routing and API requests out of UI components.

**Profile → Developer tools** opens API connection tests and the UI component preview. The preview supports light/dark/system appearance and control states.

## API connection

Start the API in a separate terminal from `backend`:

```sh
npm ci
npm start
```

In `mobile`, copy `.env.example` to `.env.local`, then reload the app. `EXPO_PUBLIC_API_URL` is the API base URL, without `/api`. The browser example uses `http://127.0.0.1:3000`.

On a physical phone, use your computer's LAN IP (same Wi-Fi) or the deployed HTTPS API address. `localhost` on a phone points to the phone. For a LAN browser, add its full origin to backend `CORS_ORIGINS`; see the [backend README](../backend/README.md).

Developer tools → Test connection reads `/api/health` and `/api/diary`. It shows actual success or failure; it does not write records. The diary response currently uses `id`, `date`, `water` and `symptoms`, with values preserved as returned by the server.

## UI rules

- Keep UI copy and team documentation in English.
- Use shared components and semantic tokens from `src/design-system`. Change colors, typography, spacing and sizes in `theme.js`.
- Selected, pressed, focused, disabled and loading states preserve control dimensions and label wrapping. Use constant borders and reserved indicators.
- Keep touch targets at least 48 logical pixels and support larger text without clipping.

## Check

```sh
npm run check
npm run export:web
npm run export:native
```

CI runs JavaScript checks, ESLint, tests, dependency checks and platform exports. Also check changed screens on a phone; web and bundle checks do not prove native layout.
