/**
 * `expo/types` is normally reached through `expo-env.d.ts`, which the CLI
 * generates and `.gitignore` excludes — so a clean checkout would not typecheck
 * until someone had run `expo start` once. Referencing it here makes
 * `npx tsc --noEmit` work from a fresh clone, which is what CI does.
 *
 * It is what declares `process.env`, so `src/lib/env.ts` can read `EXPO_PUBLIC_*`.
 *
 * The `nativewind/types` reference lives in `nativewind-env.d.ts`, which NativeWind
 * generates and asks to have committed. Duplicating it here would mean two files
 * to keep in step for one `className` prop.
 */
/// <reference types="expo/types" />
