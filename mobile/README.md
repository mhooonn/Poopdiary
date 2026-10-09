# Poop Diary mobile

Expo / React Native with JavaScript. Food, Bowel and Drinks use the Express API and one shared Diary. TypeScript checks the source with `checkJs`.

## Run

```sh
npm ci
npm start -- --go
```

Scan with Expo Go on the same Wi-Fi. For a browser, use `npm run web`. Stop Metro before reinstalling dependencies.

## Structure

```text
src/app/              Thin Expo Router routes and layouts
src/navigation/       Floating dock, shared Log menu and feedback
src/screens/          Screen content, including Developer tools
src/design-system/    Shared theme and components
src/config/           Public app configuration
src/data/api/         Backend client
src/features/         Feature forms; shared Diary model, loading and details
```

Main tabs are Today, Diary, Insights and Profile. Log opens six recording routes; Food, Bowel and Drinks are connected. Symptoms, Exercise and Sleep remain placeholders. Keep API requests in `src/data/api`.

## Bowel movements

Log → Bowel → choose a shape → Save. More details adds effort, symptoms, severity, pain location, time and an optional note. New and edit use the same form. Warning signs stop the flow without saving.

The backend SQLite database is the source of truth. Failed writes retain the form and show an error; success gives brief feedback. No offline write queue or user accounts are implemented.

## Shared Diary

`src/screens/DiaryScreen.js` and `src/features/diary/` own one timeline for Food, Bowel and Drinks. Entries use local dates and ascending times; food without a time appears last. Tap a record for shared details, Edit or Delete. New records return to Today; edits return to the record's date in Diary. The Diary `+` and bottom Log use the same menu.

One owner maintains shared Diary/navigation. Feature owners maintain their forms and API routes. Add new record types through the diary model and API client; do not add separate feature lists or forms to Diary. Old food/drinks preview components remain for compatibility.

**Profile → Developer tools** opens API connection tests and the UI component preview. The preview supports light/dark/system appearance and control states.

## API connection

Start the API in a separate terminal from `backend`:

```sh
npm ci
npm start
```

In `mobile`, copy `.env.example` to `.env.local`, then reload the app. `EXPO_PUBLIC_API_URL` is the API base URL, without `/api`. The browser example uses `http://127.0.0.1:3000`.

On a physical phone, use your computer's LAN IP (same Wi-Fi) or the deployed HTTPS API address. `localhost` on a phone points to the phone. For a LAN browser, add its full origin to backend `CORS_ORIGINS`; see the [backend README](../backend/README.md).

Developer tools → Test connection reads `/api/health`, `/api/bowel`, `/api/food` and `/api/drinks`, showing each result and record count. There is no `/api/diary` endpoint; the mobile app builds the timeline from feature endpoints.

Use the shared client in `src/data/api`; it adds `/api` to the configured base origin. Contracts are in the [backend README](../backend/README.md). Bowel/drink timestamps use UTC; the app displays local time. Food keeps its local date and optional time.

## UI rules

- Keep UI copy and team documentation in English.
- Use shared components and semantic tokens from `src/design-system`. Change colors, typography, spacing and sizes in `theme.js`.
- Selected, pressed, focused, disabled and loading states preserve control dimensions and label wrapping. Use constant borders and reserved indicators.
- Keep touch targets at least 48 logical pixels and support larger text without clipping.

Follow the [team Git rules](../PROJECT_GUIDE.md) for branches and commits.

## Check

```sh
npm run check
npm run export:web
npm run export:native
```

CI runs JavaScript checks, ESLint, tests, dependency checks and platform exports. Also check changed screens on a phone; web and bundle checks do not prove native layout.
