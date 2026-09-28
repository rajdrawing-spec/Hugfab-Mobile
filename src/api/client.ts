/**
 * The only place this app calls `fetch`.
 *
 * Everything it does is a rule from HUGFAB-AI `docs/api.md`, in one place so no
 * screen has to remember it:
 *
 * - Unwrap the envelope. A 2xx is `{ data }`; anything else is
 *   `{ error: { code, message, details? } }`. A caller gets the payload or a
 *   typed throw, never a union to pick apart.
 * - Attach `Authorization: Bearer <access_token>` when there is a session.
 * - On a 401, refresh the token **once** and replay. Twice would be a loop
 *   against an auth server, and the second failure means the refresh token is
 *   spent — which is a sign-in, not a retry.
 * - Carry `x-request-id` onto every error. It is the reference a person can
 *   quote, and the only way to find one request in a server log.
 * - Time out. React Native's fetch has no timeout of its own, so a request to an
 *   unreachable LAN address hangs until the socket gives up — which is a spinner
 *   that never resolves.
 *
 * Note the deliberate absence: nothing here interprets a payload. No price is
 * read, no total is summed, no availability is judged. Those are the web app's
 * services, and CLAUDE.md explains why they stay there.
 */

import { env, features } from '@/lib/env';
import { accessToken, refreshAccessToken } from '@/lib/supabase';
import { ApiAbortError, ApiError, ApiNetworkError, apiErrorFromBody } from './errors';

/**
 * Long enough for a cold Next.js route on a small server, short enough that a
 * wrong base URL is a visible error rather than an indefinite skeleton.
 */
const TIMEOUT_MS = 15_000;

export interface ApiRequest {
  /** Path from the API root, e.g. `/api/products`. Leading slash required. */
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Serialised as JSON. Omit for a GET. */
  body?: unknown;
  /**
   * Query parameters. `undefined` and `null` values are dropped rather than sent
   * as the string "undefined", and arrays are joined with commas because that is
   * what `docs/api.md` documents for `brand` and `retailer`.
   */
  query?: Record<
    string,
    string | number | boolean | readonly string[] | null | undefined
  >;
  /** From TanStack Query, so a screen leaving cancels its requests. */
  signal?: AbortSignal;
  /**
   * Send the bearer token even though this endpoint does not require one — for a
   * read whose answer differs when signed in. Default true: attaching a token
   * the server ignores costs nothing.
   */
  authenticated?: boolean;
}

export function buildUrl(path: string, query?: ApiRequest['query']): string {
  if (!env.apiBaseUrl) {
    throw new ApiError(
      'NOT_CONFIGURED',
      'EXPO_PUBLIC_API_BASE_URL is not set, so there is no API to call.',
      503,
    );
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    search.append(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  const qs = search.toString();
  return `${env.apiBaseUrl}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Perform a request and return its `data`.
 *
 * Throws `ApiError` for a described failure, `ApiNetworkError` when the request
 * never arrived, `ApiAbortError` when the caller cancelled.
 */
export async function apiFetch<T>(request: ApiRequest): Promise<T> {
  const url = buildUrl(request.path, request.query);
  const token =
    request.authenticated === false || !features.auth ? null : await accessToken();

  let response = await send(url, request, token);

  // One retry, and only for the one condition a retry can fix.
  if (response.status === 401 && token) {
    const fresh = await refreshAccessToken();
    if (fresh) response = await send(url, request, fresh);
  }

  const requestId = response.headers.get('x-request-id');
  const payload = await readBody(response);

  if (!response.ok) {
    throw apiErrorFromBody(payload, response.status, requestId);
  }

  /**
   * A 2xx that is not the envelope is a contract breach, not data. Saying so
   * here beats a screen rendering `undefined` and someone spending an afternoon
   * on the wrong file.
   */
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new ApiError(
      'INTERNAL',
      'HugFab answered in a shape this app does not understand.',
      response.status,
      null,
      requestId,
    );
  }

  return (payload as { data: T }).data;
}

async function send(
  url: string,
  request: ApiRequest,
  token: string | null,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // The caller's signal and our timeout both have to be able to abort. Listening
  // rather than using AbortSignal.any() keeps this working on older runtimes.
  const onCallerAbort = (): void => controller.abort();
  request.signal?.addEventListener('abort', onCallerAbort);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (request.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(url, {
      method: request.method ?? 'GET',
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: controller.signal,
    });
  } catch (cause) {
    if (request.signal?.aborted) throw new ApiAbortError();
    throw new ApiNetworkError(`Could not reach ${url}`, cause);
  } finally {
    clearTimeout(timeout);
    request.signal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * A body that is not JSON is not an error in itself — a 204 has none, and a
 * gateway error page is HTML. Returning null lets the status decide.
 */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
