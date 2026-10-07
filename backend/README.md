# Backend

```sh
npm ci
npm start
```

The API runs on port 3000 (`PORT` can override it). Current endpoints:

- `GET /api/health`: server status.
- `GET /api/diary`: SQLite diary rows. Create, edit and delete endpoints are not implemented yet.
- `/api/food`: GET lists food rows, POST creates, PUT `/:id` updates, DELETE `/:id` removes. Writes accept `foodName`, `mealType`, `date` and `notes`; name and date are required.
- `/api/bowel`: bowel records (contract below).

SQLite defaults to `backend/diary.db` regardless of the working directory. Set `DATABASE_PATH` to use a separate local database; a new empty database receives the existing sample row.

Browser CORS allows localhost/127.0.0.1 on Expo ports 8081–8083. Set `CORS_ORIGINS` to a comma-separated list for another browser origin, such as a LAN address or a deployed web app. Native requests do not use browser CORS.

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

Responses add `id`, `created_at` and `updated_at`; timestamps are normalized to UTC. The additive migration creates `bowel` and its date index without changing diary/food data. Bowel records have no sample seed. This is currently a single-user API without accounts.

Run `npm test` for isolated SQLite migration, HTTP CRUD, validation and persistence tests.
