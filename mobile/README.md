# Poop Diary mobile

Expo / React Native with JavaScript. Navigation, shared UI and bowel logging are implemented. TypeScript is a development checker (`checkJs`); application source stays JavaScript.

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
src/data/api/         Backend client
src/features/bowel/   Bowel form, API state and Diary section
```

Main tabs are Today, Diary, Insights and Profile. Log opens six recording routes; only Bowel is implemented. Other feature pages remain empty. Keep routing and API requests out of UI components.

## Bowel movements

Log → Bowel → choose a shape → Save. More details adds effort, symptoms, severity, pain location, time and an optional note. New and edit use the same form. Diary shows server records by local date; tap an entry to view, edit or delete it.

The backend SQLite database is the source of truth. Failed writes retain the form and show an error; success gives brief feedback. No offline write queue or user accounts are implemented. Selected warning signs pause the form without saving.

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

Bowel logging uses `/api/bowel` CRUD separately; its fields and status codes are in the [backend README](../backend/README.md). Times are sent in UTC and shown in the device's local time.

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
