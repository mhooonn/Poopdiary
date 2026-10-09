# Backend

```sh
npm ci
npm start
```

The API runs on port 3000 (`PORT` can override it). Current endpoints:

- `GET /api/health`: server status.
- `/api/food`: GET lists food rows, POST creates, PUT `/:id` updates, DELETE `/:id` removes. Writes accept `foodName`, `mealType`, `date`, optional `time` (`HH:MM`) and `notes`; name and date are required.
- `/api/bowel`: bowel records (contract below).
- `/api/drinks`: GET lists records (optional `?date=YYYY-MM-DD`), GET `/:id` reads one, POST creates, PUT `/:id` updates, DELETE `/:id` removes.

There is no `/api/diary` endpoint. The mobile app builds a shared timeline from the feature endpoints.

SQLite defaults to `backend/diary.db` regardless of the working directory. Set `DATABASE_PATH` to use another local database. New databases start without sample records.

Browser CORS allows localhost/127.0.0.1 on Expo ports 8081–8083. Set `CORS_ORIGINS` to a comma-separated list for another browser origin, such as a LAN address or a deployed web app. Native requests do not use browser CORS.

## Drink records

POST accepts `amount_ml` (positive integer), `drink_type`, `logged_at` (UTC timestamp), `local_date` (`YYYY-MM-DD`) and optional `note`. Supported types: water, coffee, tea, soda, juice, milk, alcohol, custom. Notes are limited to 1,000 characters.

PUT accepts `amount_ml`, `drink_type` and `note`, preserving the original date/time. GET, POST (201) and PUT (200) return complete snake_case records, including `id` and date/time. The list is sorted by `logged_at`; DELETE returns 204. Invalid input returns 400 and missing records return 404.

## Bowel records

`GET /api/bowel` lists newest first; optional `from` and `to` ISO UTC timestamps filter inclusively. `GET /api/bowel/:id` reads one record. `POST /api/bowel` creates (201), `PUT /api/bowel/:id` replaces (200), and `DELETE /api/bowel/:id` removes (204). IDs are positive integers; invalid input returns 400 and missing records return 404.

POST/PUT body:

```json
{
  "occurred_at": "2026-10-06T08:45:00.000Z",
  "stool_type": 4,
  "effort": "normal",
  "symptoms": ["bloating"],
  "bloating_level": "mild",
  "pain_level": null,
  "pain_location": null,
  "urgency_level": null,
  "notes": ""
}
```

- Required: `occurred_at` (valid UTC timestamp), `stool_type` (1–7 or null for uncertain).
- `effort`: easy, normal, some_difficulty, difficult or null.
- `symptoms`: unique codes from bloating, pain, nausea, urgency, other.
- Bloating/urgency levels: mild, moderate, severe or null. Pain: integer 0–10 and location upper_left, upper_right, center, lower_left, lower_right, whole or null.
- Optional fields default to empty/null. Details for unselected symptoms are cleared. Notes are limited to 1000 characters. Unknown fields are rejected.

Responses add `id`, `created_at` and `updated_at`; timestamps are normalized to UTC. The additive migration creates `bowel` and its date index without changing other feature data. This is currently a single-user API without accounts.

Run `npm test` for isolated SQLite migration, HTTP CRUD, validation and persistence tests.
