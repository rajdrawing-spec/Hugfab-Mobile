import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The client's own contract handling.
 *
 * **These do not test the API.** Nothing here proves HugFab answers in any
 * particular shape — that is a contract only a real request can check, and
 * `docs/PRODUCTION-READINESS.md` records that none has been made from this
 * environment yet. What is under test is the code between a response and a
 * screen: does a 2xx get unwrapped, does a described failure become a typed
 * error, does the token get attached, does a 401 replay exactly once.
 *
 * `fetch` is stubbed because the alternative is a network call, and a unit test
 * that needs the internet is a unit test that fails on a train. A stub standing
 * in for the real API in an *integration* claim would be dishonest; a stub
 * proving `apiFetch` unwraps `{ data }` is just a test.
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

const auth = {
  token: null as string | null,
  refreshed: null as string | null,
  refreshCalls: 0,
};

vi.mock('@/lib/supabase', () => ({
  accessToken: () => Promise.resolve(auth.token),
  refreshAccessToken: () => {
    auth.refreshCalls += 1;
    return Promise.resolve(auth.refreshed);
  },
  supabase: null,
  startSessionRefresh: () => () => undefined,
}));

const { apiFetch, buildUrl } = await import('./client');
const { ApiError, ApiNetworkError } = await import('./errors');

interface Call {
  url: string;
  init: RequestInit;
}

const calls: Call[] = [];

function reply(
  body: unknown,
  init: { status?: number; requestId?: string; raw?: string } = {},
): Response {
  const status = init.status ?? 200;
  const headers = new Headers();
  if (init.requestId) headers.set('x-request-id', init.requestId);
  const text = init.raw ?? JSON.stringify(body);
  return new Response(text, { status, headers });
}

/** Answer each call in turn; the last answer repeats. */
function serve(...responses: Response[]): void {
  let index = 0;
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return Promise.resolve(response);
  });
}

beforeEach(() => {
  calls.length = 0;
  auth.token = null;
  auth.refreshed = null;
  auth.refreshCalls = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildUrl', () => {
  it('joins the base and the path', () => {
    expect(buildUrl('/api/products')).toBe('https://hugfab.test/api/products');
  });

  it('drops null and undefined rather than sending the string "undefined"', () => {
    // A filter nobody set must not become ?gender=undefined, which the route
    // would then reject as an invalid enum.
    const url = buildUrl('/api/products', { q: 'dress', gender: undefined, page: null });
    expect(url).toBe('https://hugfab.test/api/products?q=dress');
  });

  it('joins an array with commas, which is what the route parses', () => {
    const url = buildUrl('/api/products', { brand: ['zara', 'hm'] });
    expect(url).toBe('https://hugfab.test/api/products?brand=zara%2Chm');
  });

  it('keeps a false, because false is a value', () => {
    // inStock=false is a real filter. Dropping it because it is falsy would
    // silently widen the search.
    expect(buildUrl('/api/products', { inStock: false })).toBe(
      'https://hugfab.test/api/products?inStock=false',
    );
  });

  it('keeps a zero', () => {
    expect(buildUrl('/api/products', { minPrice: 0 })).toBe(
      'https://hugfab.test/api/products?minPrice=0',
    );
  });
});

describe('the envelope', () => {
  it('returns data and nothing else', async () => {
    serve(reply({ data: { items: [1, 2] } }));
    await expect(apiFetch({ path: '/api/products' })).resolves.toEqual({ items: [1, 2] });
  });

  it('returns a null data, because null is an answer', async () => {
    // GET /api/account/summary answers 200 with data: null for a visitor who
    // is not signed in. That is "nobody is signed in", not a failure.
    serve(reply({ data: null }));
    await expect(apiFetch({ path: '/api/account/summary' })).resolves.toBeNull();
  });

  it('throws on a 200 that is not the envelope', async () => {
    // A contract breach, not data. Saying so here beats a screen rendering
    // undefined and somebody spending an afternoon in the wrong file.
    serve(reply({ items: [] }));
    await expect(apiFetch({ path: '/api/products' })).rejects.toThrow(ApiError);
  });

  it('throws on a 200 whose body is not JSON at all', async () => {
    serve(reply(null, { raw: '<html>maintenance</html>' }));
    await expect(apiFetch({ path: '/api/products' })).rejects.toThrow(ApiError);
  });
});

describe('failures', () => {
  it('becomes a typed error carrying the API sentence', async () => {
    serve(
      reply(
        { error: { code: 'UNPROCESSABLE', message: 'That size is no longer held.' } },
        { status: 422 },
      ),
    );
    await expect(
      apiFetch({ path: '/api/cart/items', method: 'POST' }),
    ).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
      message: 'That size is no longer held.',
      status: 422,
    });
  });

  it('carries x-request-id onto the error', async () => {
    serve(
      reply(
        { error: { code: 'INTERNAL', message: 'Oops.' } },
        { status: 500, requestId: 'req_7' },
      ),
    );
    await expect(apiFetch({ path: '/api/products' })).rejects.toMatchObject({
      requestId: 'req_7',
    });
  });

  it('turns a transport failure into ApiNetworkError, not a described one', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Network request failed')));
    await expect(apiFetch({ path: '/api/products' })).rejects.toThrow(ApiNetworkError);
  });
});

describe('the bearer token', () => {
  it('is attached when there is a session', async () => {
    auth.token = 'jwt-abc';
    serve(reply({ data: {} }));
    await apiFetch({ path: '/api/orders' });
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe(
      'Bearer jwt-abc',
    );
  });

  it('is absent when there is none', async () => {
    serve(reply({ data: {} }));
    await apiFetch({ path: '/api/products' });
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBeNull();
  });

  it('is withheld when the caller says the endpoint is public', async () => {
    auth.token = 'jwt-abc';
    serve(reply({ data: {} }));
    await apiFetch({ path: '/api/products', authenticated: false });
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBeNull();
  });
});

describe('the 401 replay', () => {
  it('refreshes once and replays with the new token', async () => {
    auth.token = 'stale';
    auth.refreshed = 'fresh';
    serve(
      reply({ error: { code: 'UNAUTHORIZED', message: 'nope' } }, { status: 401 }),
      reply({ data: { ok: true } }),
    );

    await expect(apiFetch({ path: '/api/orders' })).resolves.toEqual({ ok: true });
    expect(auth.refreshCalls).toBe(1);
    expect(calls).toHaveLength(2);
    expect(new Headers(calls[1]?.init.headers).get('authorization')).toBe('Bearer fresh');
  });

  it('gives up after one replay rather than looping', async () => {
    /*
     * Two 401s in a row means the refresh token is spent, which is a sign-in
     * and not a retry. Looping here would hammer the auth server on every
     * screen a signed-out session opens.
     */
    auth.token = 'stale';
    auth.refreshed = 'also-stale';
    serve(reply({ error: { code: 'UNAUTHORIZED', message: 'nope' } }, { status: 401 }));

    await expect(apiFetch({ path: '/api/orders' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(auth.refreshCalls).toBe(1);
    expect(calls).toHaveLength(2);
  });

  it('does not try to refresh when there was no token to begin with', async () => {
    // A 401 on a signed-out request is the correct answer, not a stale token.
    serve(reply({ error: { code: 'UNAUTHORIZED', message: 'nope' } }, { status: 401 }));
    await expect(apiFetch({ path: '/api/orders' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(auth.refreshCalls).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('does not replay when the refresh itself fails', async () => {
    auth.token = 'stale';
    auth.refreshed = null;
    serve(reply({ error: { code: 'UNAUTHORIZED', message: 'nope' } }, { status: 401 }));

    await expect(apiFetch({ path: '/api/orders' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(calls).toHaveLength(1);
  });
});

describe('the request itself', () => {
  it('sends a JSON body and says so', async () => {
    serve(reply({ data: {} }));
    await apiFetch({ path: '/api/wishlist', method: 'POST', body: { productId: 'p1' } });

    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe('{"productId":"p1"}');
    expect(new Headers(calls[0]?.init.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('sets no content-type on a GET, which has no body', async () => {
    serve(reply({ data: {} }));
    await apiFetch({ path: '/api/products' });
    expect(new Headers(calls[0]?.init.headers).get('content-type')).toBeNull();
    expect(calls[0]?.init.body).toBeUndefined();
  });
});
