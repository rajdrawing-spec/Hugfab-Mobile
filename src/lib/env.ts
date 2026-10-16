/**
 * The app's configuration, read once and validated once.
 *
 * Mirrors HUGFAB-AI `src/lib/env.server.ts` in spirit: a missing value degrades a
 * feature and says so, rather than failing somewhere far from the cause. But the
 * consequences are inverted. A server refuses to start; an app that refuses to
 * start is uninstalled. So nothing here throws — `features` reports what is
 * configured and the screens behind an unconfigured feature say so.
 *
 * Only `EXPO_PUBLIC_*` reaches the running app, and it is inlined into the bundle
 * at build time. Everything here is therefore public by construction: the anon
 * key, which RLS constrains, and a base URL. No secret may ever be added.
 *
 * Each value falls back to `publicConfig` — the production HugFab backend,
 * committed, because all three are already public (see `public-config.ts`). So
 * the app is configured out of the box and an environment variable is an
 * override, for a local `next dev` or a staging project, rather than a
 * precondition. `features` is therefore true in a normal build, and false only
 * where `public-config.ts` itself was emptied — so the screens behind it keep
 * their unconfigured state and the tests that cover it still mean something.
 */

import { publicConfig } from './public-config';

function read(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Trailing slash removed, so `${API_BASE_URL}/api/products` never becomes a
 * double slash — which some proxies redirect and some 404.
 */
function normaliseBaseUrl(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\/+$/, '');
}

export const env = {
  apiBaseUrl: normaliseBaseUrl(
    read(process.env.EXPO_PUBLIC_API_BASE_URL) ?? publicConfig.apiBaseUrl,
  ),
  supabaseUrl: read(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? publicConfig.supabaseUrl,
  supabaseAnonKey:
    read(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? publicConfig.supabaseAnonKey,
} as const;

export const features = {
  /** Without this nothing loads at all: every screen reads the catalogue. */
  api: env.apiBaseUrl !== null,
  /** Without this, browsing works and signing in does not. */
  auth: env.supabaseUrl !== null && env.supabaseAnonKey !== null,
} as const;

/**
 * What a screen shows when a feature is switched off. Names where the value
 * comes from, because the person reading it on a test device is usually the
 * person who can set it — and since `public-config.ts` carries a default, this
 * now means somebody emptied that too.
 */
export function missingConfigMessage(): string | null {
  if (!features.api) {
    return 'There is no API base URL, so there is nothing to load. Set EXPO_PUBLIC_API_BASE_URL (.env.local) or restore the default in src/lib/public-config.ts, then restart the dev server.';
  }
  return null;
}
