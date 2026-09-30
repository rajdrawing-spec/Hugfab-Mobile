/**
 * The seller and admin consoles.
 *
 * Both routes are live in HUGFAB-AI today — `/api/merchant/attention` and
 * `/api/admin/attention` — so this is the one part of the app that needed no
 * entry in `docs/API-GAPS.md` beyond the bearer-token change every authenticated
 * call needs.
 *
 * **A 404 here does not mean the feature is missing.** Both guards answer
 * `NOT_FOUND` for a signed-in person who is not a seller or not an admin, and
 * they do it deliberately: `requireApiSeller` says so in as many words — an
 * endpoint for shops should not confirm to someone without one that it exists.
 * So these return `null` on a 404 rather than going through `orUnavailable`,
 * which would tell a shopper their dashboard "is not in the app yet" when the
 * truth is that they do not have one.
 */

import { apiFetch } from './client';
import { ApiError } from './errors';
import type { AdminAttention, MerchantAttention } from './types';

/** Null when this account has no seller console, or none it may view. */
export function getMerchantAttention(
  signal?: AbortSignal,
): Promise<MerchantAttention | null> {
  return orNoConsole(
    apiFetch<MerchantAttention>({ path: '/api/merchant/attention', signal }),
  );
}

/** Null when this account is not an admin. */
export function getAdminAttention(signal?: AbortSignal): Promise<AdminAttention | null> {
  return orNoConsole(apiFetch<AdminAttention>({ path: '/api/admin/attention', signal }));
}

/**
 * `NOT_FOUND` and `FORBIDDEN` both mean "this console is not yours", and neither
 * is an error worth showing. `FORBIDDEN` is the narrower case — a seller whose
 * role lacks the capability — and it carries a message, but it still resolves to
 * "no console" rather than a red screen on the one tab a seller opens most.
 *
 * Every other failure is a real failure and throws: a 401 must reach the screen
 * as a 401, and a network failure must offer Retry.
 */
async function orNoConsole<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')
    ) {
      return null;
    }
    throw error;
  }
}
