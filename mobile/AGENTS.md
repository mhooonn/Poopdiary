# Mobile agent guide

Read [README.md](README.md) and `package.json` before working here. Prioritize phone layouts and native accessibility.

## Team decisions

- Use JavaScript (`.js` / `.jsx`). Do not convert the project to TypeScript without team agreement. JSDoc and `checkJs` provide development checks.
- Reuse `src/design-system` components and semantic theme tokens. See the README for UI rules, including stable dimensions across interaction states.
- The current app is a component preview. Navigation and feature architecture remain team decisions; do not install a router or implement diary/backend features as part of UI foundation work.

## Expo APIs and dependencies

Before changing Expo, EAS or React Native APIs:

1. Read the installed Expo major version in `package.json`.
2. Read matching docs at `https://docs.expo.dev/versions/v<major>.0.0/`.
3. For other topics, use https://docs.expo.dev/llms.txt and follow its relevant links.

Use `npx expo install <package>` for Expo / React Native dependencies so versions match the SDK. Prefer Expo modules when suitable. Use `bunx` instead of `npx` only if the project adopts Bun.

Run `npm run check` before declaring work complete. Use `npx expo-doctor` to diagnose dependency/configuration problems; inspect its findings before applying `npx expo install --fix`.

## Native configuration and builds

- If `ios/` and `android/` are absent, use Continuous Native Generation. Configure native behavior through `app.json` and config plugins; do not create or edit generated native directories by hand.
- Expo Go only contains bundled native modules. Libraries requiring other native modules need a development build (`npx expo run:android`, `npx expo run:ios`, or EAS).
- EAS can build, sign, submit and deliver updates. Use `npx eas-cli@latest <command>` with npm, or `bunx eas-cli <command>` with Bun. See https://docs.expo.dev/eas/index.md before configuring it.

Do not add EAS, cloud services or extra dependencies unless the requested task needs them.
