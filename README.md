# Poop Diary

Poop Diary is a mobile app for keeping track of bowel movements and daily habits. It brings food, drinks, exercise and sleep records into one diary, helping users review their routines and explore patterns in their digestive health.

Built by **Hao, Max and Laura** for the HAMK Mobile Programming project.

## Features

| Feature | What it does |
| --- | --- |
| **Today** | A daily overview of logged meals, drinks, bowel movements, exercise and sleep. |
| **Diary** | Browse records by date, open entry details, and edit or delete entries. |
| **Logging** | Record stool shape and symptoms, meals, drink amounts, exercise, and sleep details such as duration and quality. |
| **Meal photos** | Take a photo with the rear camera, attach it to a meal, and view it in the Diary. Photos are stored on the device. |
| **Insights** | Review 7-day or 30-day summaries of bowel movements, food, drinks and exercise. Optional AI analysis turns these records into a short report with observations, practical suggestions and supporting evidence. |
| **Daily reminders** | Choose a time and repeat days for a quiet local notification. Tapping the reminder opens Today. |
| **Appearance** | Choose light, dark or system mode from Profile. Shared components keep the screens consistent. |

## Tech stack

- **App:** React Native, Expo SDK 57, JavaScript and Expo Router.
- **API and database:** Node.js, Express and SQLite.
- **Native features:** Camera access, local photo storage and local notifications.
- **AI:** A configurable OpenAI-compatible API.
- **Code checks:** JSDoc type checking, ESLint, Node.js tests and GitHub Actions.

## Run locally

You will need **Node.js 22 LTS (22.13 or later)** and npm. For Android, install Android Studio with an emulator, Android SDK and JDK 17.

```sh
git clone https://github.com/mhooonn/Poopdiary.git
cd Poopdiary
```

### 1. Start the backend

From the project root:

```sh
cd backend
npm ci
npm start
```

The API runs at **http://localhost:3000**. SQLite creates `backend/diary.db` automatically. Check [API health](http://localhost:3000/api/health) to confirm it is running.

### 2. Set up the app

In a second terminal, from the project root:

```sh
cd mobile
npm ci
cp .env.example .env.local
```

In `mobile/.env.local`, set `EXPO_PUBLIC_API_URL` to the backend address for your device. Use the origin without an `/api` suffix.

| Where the app runs | API URL |
| --- | --- |
| Android Studio emulator | `http://10.0.2.2:3000` |
| Browser on your computer | `http://127.0.0.1:3000` |
| Physical phone on the same Wi-Fi | Your computer's LAN address, for example `http://192.168.1.20:3000` |

For the Android emulator:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

### 3. Launch Android

Start your emulator, then run from `mobile/`:

```sh
npx expo run:android --port 8091
```

This builds and installs the development app, including the native features. For later sessions, start the backend and run:

```sh
npx expo start --dev-client --lan --port 8091
```

Open **Poop Diary** on the emulator. Rebuild with `expo run:android` after changing native dependencies. The local setup uses **8091 for Expo** and **3000 for the API**.

For a browser preview, use the browser API URL above and run `npm run web -- --port 8091` from `mobile/`. Use the Android development build to try local reminders.

## Set up AI Insights

1. Open **Profile → Developer tools → AI insight settings**.
2. Enter your API endpoint, model ID and API key. Choose **Save locally**, then **Test connection**.
3. Open **Insights**, select **7 days** or **30 days**, read and tick the consent checkbox, then choose **Enable analysis** to generate a report.

The report focuses on a main finding, what to try next and what to look for. **View evidence and details** expands the supporting observations.

The API key and settings are saved locally on the device. With the user's consent, the app sends selected bowel, food, drink and exercise data to the configured AI service. Record IDs, exact calendar dates, notes and meal photos are excluded from the AI request.

## Project structure

```text
mobile/
  src/app/             Expo Router routes and layouts
  src/screens/         Main screens and Developer tools
  src/features/        Logging, Diary, Insights and reminders
  src/design-system/   Shared components, themes and appearance settings
  src/navigation/      Navigation controls and record feedback
  src/data/api/        API client and record operations
  tests/               App logic and component rule tests
backend/
  routes/              REST API endpoints
  database/            SQLite tables and database setup
  scripts/             Sample data tools
  tests/               API and database tests
```

## Checks and sample data

Run `npm run check` from `mobile/` for type checks, linting and tests. Run `npm test` from `backend/` for API and database tests.

To explore the Diary and Insights with sample records, keep the backend running and run this in another terminal from `backend/`:

```sh
npm run seed:insights
```

This adds 15 days of varied food, drink, bowel and exercise records. Running it again refreshes the sample records created by the script.
