# Backend

```sh
npm ci
npm start
```

The API runs on port 3000 (`PORT` can override it). Current endpoints:

- `GET /api/health`: server status.
- `GET /api/diary`: SQLite diary rows. Create, edit and delete endpoints are not implemented yet.

SQLite defaults to `backend/diary.db` regardless of the working directory. Set `DATABASE_PATH` to use a separate local database; a new empty database receives the existing sample row.

Browser CORS allows localhost/127.0.0.1 on Expo ports 8081–8083. Set `CORS_ORIGINS` to a comma-separated list for another browser origin, such as a LAN address or a deployed web app. Native requests do not use browser CORS.
