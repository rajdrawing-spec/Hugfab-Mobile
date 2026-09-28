/**
 * The TanStack Query client, configured for a phone rather than for a desktop
 * browser.
 *
 * Three departures from the defaults, each for a reason a mobile network gives:
 *
 * - `retry` refuses to retry a described failure. A 404, a 401 or a 422 will
 *   answer the same way three times; retrying them spends the caller's rate-limit
 *   budget (`search` is 60/min) and delays the error a person is waiting for.
 *   Network failures and 5xx are retried, because those do pass.
 * - `staleTime` is a minute for the catalogue, which matches the
 *   `s-maxage=60` the API already sets on it. Re-fetching sooner than the server
 *   would answer differently is data no one asked for on a metered connection.
 * - `refetchOnWindowFocus` is off. On a phone "focus" fires every time the app
 *   comes forward, which is often, and a refetch storm on resume is how an app
 *   earns a reputation for eating data.
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError, ApiNetworkError, FeatureUnavailableError } from '@/api/errors';

const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error instanceof FeatureUnavailableError) return false;
  if (error instanceof ApiNetworkError) return true;
  if (error instanceof ApiError) return error.retryable;
  return false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // A write is not idempotent unless the route says so. Retrying a
        // "add to bag" that actually succeeded adds it twice.
        retry: false,
      },
    },
  });
}
