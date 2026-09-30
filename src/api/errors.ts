/**
 * The error codes HUGFAB-AI documents, as types.
 *
 * Source: that repo's `docs/api.md`. Every failure arrives as
 * `{ "error": { "code", "message", "details"? } }` and `message` is explicitly
 * documented as safe to show a user — so the app shows it, rather than
 * substituting a friendlier sentence that says less.
 */

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'NOT_CONFIGURED',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * A failure the API described. Distinct from a transport failure (`ApiNetworkError`)
 * because the two want different words on screen: one is "that is not allowed",
 * the other is "we could not reach HugFab".
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | null;
  /**
   * `x-request-id` from the response. `docs/api.md`: it is the only thing a user
   * can usefully quote back, so it is carried onto the error and shown on a 500.
   */
  readonly requestId: string | null;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details: Record<string, unknown> | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  /** Per-field messages from a `BAD_REQUEST`, for a form. */
  get fieldErrors(): Record<string, string[]> | null {
    const fields = this.details?.fields;
    return fields && typeof fields === 'object'
      ? (fields as Record<string, string[]>)
      : null;
  }

  /** Seconds to wait, on a `RATE_LIMITED`. */
  get retryAfterSeconds(): number | null {
    const value = this.details?.retryAfter;
    return typeof value === 'number' ? value : null;
  }

  /**
   * Whether trying again could plausibly work. A 409 or a 422 will not: the
   * request was understood and refused, and a Retry button on it teaches
   * someone that buttons do nothing.
   */
  get retryable(): boolean {
    return this.code === 'RATE_LIMITED' || this.code === 'INTERNAL';
  }
}

/**
 * The request never got an answer: no signal, captive portal, a dev server on a
 * laptop that went to sleep, the wrong LAN address in `EXPO_PUBLIC_API_BASE_URL`.
 *
 * Its own class because it is the failure a phone actually has, many times a day,
 * and it is always worth retrying.
 */
export class ApiNetworkError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'ApiNetworkError';
  }
}

/** A request the app abandoned — a screen unmounted, a query was cancelled. */
export class ApiAbortError extends Error {
  constructor() {
    super('Request cancelled.');
    this.name = 'ApiAbortError';
  }
}

/**
 * The sentence to put on screen, and whether to offer Retry beside it.
 *
 * One function so every error state in the app reads the same way. The API's own
 * `message` is preferred wherever there is one — it is written for a user and it
 * is specific, and replacing "That size is no longer held" with "Something went
 * wrong" is a downgrade dressed as polish.
 */
export function describeError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof ApiNetworkError) {
    return {
      message: 'Could not reach HugFab. Check your connection and try again.',
      retryable: true,
    };
  }

  if (error instanceof ApiAbortError) {
    return { message: 'Cancelled.', retryable: true };
  }

  if (error instanceof FeatureUnavailableError) {
    return { message: error.message, retryable: false };
  }

  if (error instanceof ApiError) {
    if (error.code === 'INTERNAL' && error.requestId) {
      return {
        message: `${error.message} (reference ${error.requestId})`,
        retryable: true,
      };
    }
    if (error.code === 'RATE_LIMITED') {
      const seconds = error.retryAfterSeconds;
      return {
        message: seconds
          ? `Too many requests. Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
          : error.message,
        retryable: true,
      };
    }
    return { message: error.message, retryable: error.retryable };
  }

  /**
   * A plain Error still carries a sentence somebody wrote — a missing
   * configuration variable, a failed assertion. Showing "Something went wrong"
   * over the top of it hides the one useful thing on the screen, which is
   * exactly what the person debugging it needs.
   */
  if (error instanceof Error && error.message.length > 0) {
    return { message: error.message, retryable: false };
  }

  return { message: 'Something went wrong.', retryable: true };
}

/**
 * Parse an error body into an `ApiError`. A response that is not the documented
 * envelope — an Nginx 502 page, a Cloudflare challenge — still has to become a
 * typed error, so the status decides the code in that case.
 */
export function apiErrorFromBody(
  body: unknown,
  status: number,
  requestId: string | null,
): ApiError {
  const envelope =
    body && typeof body === 'object' && 'error' in body
      ? (body as { error: unknown }).error
      : null;

  if (envelope && typeof envelope === 'object') {
    const { code, message, details } = envelope as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    return new ApiError(
      isApiErrorCode(code) ? code : codeForStatus(status),
      typeof message === 'string' && message.length > 0
        ? message
        : defaultMessageForStatus(status),
      status,
      details && typeof details === 'object'
        ? (details as Record<string, unknown>)
        : null,
      requestId,
    );
  }

  return new ApiError(
    codeForStatus(status),
    defaultMessageForStatus(status),
    status,
    null,
    requestId,
  );
}

function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'NOT_CONFIGURED';
    default:
      return 'INTERNAL';
  }
}

function defaultMessageForStatus(status: number): string {
  if (status === 404) return 'Not found.';
  if (status === 401) return 'You need to be signed in to do that.';
  if (status >= 500) return 'HugFab could not answer that just now.';
  return 'That request could not be completed.';
}

/**
 * A feature whose endpoint HUGFAB-AI has not shipped yet — `docs/API-GAPS.md`.
 *
 * Raised when a gap route answers 404, rather than letting "Not found." reach the
 * screen: a shopper reading that about their own Bag would reasonably conclude
 * the app is broken. This says what is true, and offers the web page that does
 * work.
 *
 * Deliberately derived from the response rather than from a flag in the app. The
 * day those routes ship, every screen behind one starts working with no release
 * here — a constant listing "not built yet" would have to be found and edited,
 * and would be wrong in the meantime.
 */
export class FeatureUnavailableError extends Error {
  /** Where on the website this does work, as a path. */
  readonly webPath: string;

  constructor(feature: string, webPath: string) {
    super(`${feature} is not in the app yet. It works on the HugFab website.`);
    this.name = 'FeatureUnavailableError';
    this.webPath = webPath;
  }
}

/**
 * Wrap a gap-route call: a 404 becomes `FeatureUnavailableError`, everything else
 * passes through unchanged. A 401 still has to reach the screen as a 401 — "sign
 * in" and "not built yet" are different answers and only one of them is the
 * shopper's to act on.
 */
export async function orUnavailable<T>(
  promise: Promise<T>,
  feature: string,
  webPath: string,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      throw new FeatureUnavailableError(feature, webPath);
    }
    throw error;
  }
}
