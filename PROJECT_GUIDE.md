# Team guide

- `mobile/`: Expo / React Native app in JavaScript. Read its [guide](mobile/AGENTS.md) and [README](mobile/README.md).
- `backend/`: Express API and SQLite. See its [README](backend/README.md).

Food, Bowel and Drinks use one shared Diary. Other logging routes are placeholders; Azure integration is planned.

## Shared rules

- One owner maintains shared Diary/navigation; feature owners maintain their own forms, tables and API routes. Follow the [Diary integration rules](mobile/README.md#shared-diary).
- Use the API client in `mobile/src/data/api`. `EXPO_PUBLIC_API_URL` is the origin without `/api`; there is no `/api/diary` endpoint.
- Keep UI and documentation in English. Use shared theme tokens and controls; interactions must not resize controls.

## Git

Use short feature branch names and commit messages, such as `bowel-movements` and `bowel movements api`. Do not include AI tool names or prefixes. Keep changes focused and use a PR into `main` with passing checks.
