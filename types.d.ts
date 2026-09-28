/**
 * Ambient types this project needs and cannot get from a package's own entry.
 *
 * `expo/types` is normally reached through `expo-env.d.ts`, which the CLI
 * generates and `.gitignore` excludes — so a clean checkout would not typecheck
 * until someone had run `expo start` once. Referencing it here instead makes
 * `npx tsc --noEmit` work from a fresh clone, which is what CI does.
 *
 * It is what declares `process.env`, so `src/lib/env.ts` can read
 * `EXPO_PUBLIC_*`.
 */
/// <reference types="expo/types" />

/** `className` on a React Native component. */
/// <reference types="nativewind/types" />
