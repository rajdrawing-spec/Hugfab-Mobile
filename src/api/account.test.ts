import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Closing an account, from this app's side.
 *
 * **This does not test the API.** `fetch` is stubbed. What is pinned is the
 * one property that would be a store-compliance bug rather than a cosmetic
 * one: that a refusal is shown rather than softened.
 *
 * `UNPROCESSABLE` here means a record HugFab keeps on purpose is in the way
 * and a person has to finish the job by hand. Turning that into "closing your
 * account is not in the app yet" would tell somebody their deletion request
 * was a feature request.
 */

vi.mock('@/lib/env', () => ({
  env: {
    apiBaseUrl: 'https://hugfab.test',
    supabaseUrl: 'https://project.supabase.co',
    supabaseAnonKey: 'anon',
  },
  features: { api: true, auth: true },
  missingConfigMessage: () => null,
}));

vi.mock('@/lib/supabase', () => ({
  accessToken: () => Promise.resolve('token-abc'),
  refreshAccessToken: () => Promise.resolve(null),
  supabase: null,
  startSessionRefresh: () => () => undefined,
}));

const { deleteAccount } = await import('./account');
const { ApiError, FeatureUnavailableError } = await import('./errors');

interface Call {
  url: string;
  init: RequestInit;
}

const calls: Call[] = [];

function serve(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: new Headers() }),
    );
  });
}

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('closing an account', () => {
  it('posts the typed confirmation the route insists on', async () => {
    serve({ data: { deleted: true } });

    await deleteAccount();

    expect(calls[0]?.url).toBe('https://hugfab.test/api/account/delete');
    expect(calls[0]?.init.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ confirm: 'DELETE' });
  });

  it('shows a kept record as the refusal it is, not as a missing feature', async () => {
    serve(
      {
        error: {
          code: 'UNPROCESSABLE',
          message:
            'Your account is linked to a payment we have to keep, so it cannot be ' +
            'closed automatically yet. Email us and we will do it by hand.',
        },
      },
      422,
    );

    const failure = await deleteAccount().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(FeatureUnavailableError);
    expect(failure).toHaveProperty('message', expect.stringContaining('by hand'));
  });
});
