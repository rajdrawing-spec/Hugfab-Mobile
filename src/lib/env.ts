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
 */

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
  apiBaseUrl: normaliseBaseUrl(read(process.env.EXPO_PUBLIC_API_BASE_URL)),
  supabaseUrl: read(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const features = {
  /** Without this nothing loads at all: every screen reads the catalogue. */
  api: env.apiBaseUrl !== null,
  /** Without this, browsing works and signing in does not. */
  auth: env.supabaseUrl !== null && env.supabaseAnonKey !== null,
} as const;

/**
 * What a screen shows when a feature is switched off. Names the variable,
 * because the person reading it on a test device is usually the person who can
 * set it.
 */
export function missingConfigMessage(): string | null {
  if (!features.api) {
    return 'EXPO_PUBLIC_API_BASE_URL is not set, so there is nothing to load. Copy .env.example to .env.local and restart the dev server.';
  }
  return null;
}
