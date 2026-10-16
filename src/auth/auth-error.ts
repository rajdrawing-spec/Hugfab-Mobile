/**
 * What to put on screen when a Supabase auth call fails.
 *
 * Sign-in does not go through `apiFetch`, so it never met `describeError` and
 * showed whatever supabase-js said. For a refused password that is right and
 * deliberate — "Invalid login credentials" is vague on Supabase's side so the
 * screen cannot confirm which addresses are registered, and rewording it is how
 * an app accidentally becomes an enumeration oracle.
 *
 * For a failure to *reach* Supabase it is wrong. The raw message is
 * `Failed to fetch` on web and `Network request failed` on Android: browser
 * jargon, no next step, and a different sentence from the one the same phone
 * sees on Home for the same lost connection. Screenshotting the two side by
 * side is what showed it.
 *
 * So: transport failures get the app's own sentence, everything else is passed
 * through untouched.
 *
 * The shape is duck-typed rather than caught with `instanceof`. auth-js's own
 * `isAuthRetryableFetchError` is `isAuthError(e) && e.name ===
 * 'AuthRetryableFetchError'`, and this module may not import supabase-js —
 * `eslint.config.js` restricts that to `src/lib/supabase.ts`. Checking the same
 * two fields keeps the rule and keeps this testable in Node.
 */

import { NETWORK_MESSAGE } from '@/api/errors';

/**
 * auth-js builds `AuthRetryableFetchError` with status 0 when `fetch` itself
 * threw, and with the HTTP status when the server answered 5xx. The two are
 * different failures to a person: one is their signal, the other is ours.
 */
const SERVER_MESSAGE = 'HugFab could not sign you in just now. Try again in a moment.';

interface RetryableAuthError {
  name: string;
  status: number;
  message: string;
}

function isRetryableFetchError(error: unknown): error is RetryableAuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '__isAuthError' in error &&
    (error as { name?: unknown }).name === 'AuthRetryableFetchError'
  );
}

export function authErrorMessage(error: unknown): string {
  if (isRetryableFetchError(error)) {
    return error.status === 0 ? NETWORK_MESSAGE : SERVER_MESSAGE;
  }

  if (error instanceof Error && error.message.length > 0) return error.message;

  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message;
  }

  return 'Could not sign in.';
}
