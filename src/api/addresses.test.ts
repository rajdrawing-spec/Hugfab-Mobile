import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AddressInput } from './types';

/**
 * What this module sends, and that it does not soften what comes back.
 *
 * **These do not test the API.** As with `client.test.ts`, `fetch` is stubbed:
 * nothing here proves HugFab's address routes answer in any particular shape.
 * What is under test is the request this app builds — the method, where the id
 * goes, whether `line2` survives being empty — and the one decision worth
 * locking down: that these routes are *not* treated as gap routes, so a real
 * 404 reaches the screen as a 404.
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

const {
  createAddress,
  getAddressBook,
  makeDefaultAddress,
  removeAddress,
  updateAddress,
} = await import('./addresses');
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
      new Response(JSON.stringify(body), {
        status,
        headers: new Headers(),
      }),
    );
  });
}

function sentBody(): Record<string, unknown> {
  const raw = calls[0]?.init.body;
  return typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

const input: AddressInput = {
  label: 'Home',
  kind: 'home',
  name: 'Asha Menon',
  phone: '9876543210',
  line1: 'Flat 201, Sunrise Apartments',
  line2: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560102',
};

const saved = { address: { id: 'a1' }, addresses: [{ id: 'a1' }] };

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading the book', () => {
  it('returns the envelope as the API sent it, unavailable included', async () => {
    /*
     * The one thing this module must not do. `unavailable: true` means the book
     * could not be read, and flattening it into `addresses: []` would tell
     * somebody their saved addresses are gone. Both the route and docs/api.md
     * say so explicitly, so the flag travels to the screen untouched.
     */
    serve({ data: { addresses: [], defaultId: null, unavailable: true } });
    await expect(getAddressBook()).resolves.toEqual({
      addresses: [],
      defaultId: null,
      unavailable: true,
    });
  });

  it('carries the bearer token, because the route requires a user', async () => {
    serve({ data: { addresses: [], defaultId: null, unavailable: false } });
    await getAddressBook();
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-abc');
  });
});

describe('saving', () => {
  it('POSTs a new address to the collection', async () => {
    serve({ data: saved }, 201);
    await createAddress(input);
    expect(calls[0]?.url).toBe('https://hugfab.test/api/account/addresses');
    expect(calls[0]?.init.method).toBe('POST');
  });

  it('sends line2 even when it is empty', async () => {
    /*
     * `addressFieldsSchema` has `line2: z.string().trim().max(200)` with no
     * `.optional()`. An address with no second line therefore has to send `""`
     * — omitting the key is a validation failure, not "no second line", and the
     * form would come back with a field error nobody could act on.
     */
    serve({ data: saved }, 201);
    await createAddress(input);
    expect(sentBody()).toHaveProperty('line2', '');
  });

  it('PATCHes an edit to the address, with the id in the path and not the body', async () => {
    // The route does `saveAddress({ ...body, id })` with the id from the path,
    // so one in the body would be overwritten anyway. Sending both invites a
    // mismatch that would quietly change the wrong address.
    serve({ data: saved });
    await updateAddress('a1', input);
    expect(calls[0]?.url).toBe('https://hugfab.test/api/account/addresses/a1');
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(sentBody()).not.toHaveProperty('id');
  });

  it('escapes the id rather than pasting it into the path', async () => {
    serve({ data: saved });
    await updateAddress('a/../b', input);
    expect(calls[0]?.url).toBe('https://hugfab.test/api/account/addresses/a%2F..%2Fb');
  });

  it('surfaces a rejected field as a BAD_REQUEST the form can read', async () => {
    serve(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'Some details need fixing.',
          details: {
            fields: { postalCode: 'A PIN code is six digits, not starting with zero' },
          },
        },
      },
      400,
    );
    await expect(createAddress(input)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ApiError &&
        error.fieldErrors?.postalCode ===
          'A PIN code is six digits, not starting with zero',
    );
  });
});

describe('removing and defaulting', () => {
  it('DELETEs one address', async () => {
    serve({ data: { removed: true, addresses: [] } });
    await expect(removeAddress('a1')).resolves.toEqual({
      removed: true,
      addresses: [],
    });
    expect(calls[0]?.init.method).toBe('DELETE');
  });

  it('POSTs to the default sub-route rather than patching isDefault', async () => {
    serve({ data: { defaultId: 'a1', addresses: [] } });
    await makeDefaultAddress('a1');
    expect(calls[0]?.url).toBe('https://hugfab.test/api/account/addresses/a1/default');
    expect(calls[0]?.init.method).toBe('POST');
  });
});

describe('these are not gap routes', () => {
  it('lets a 404 through as a 404 instead of "not in the app yet"', async () => {
    /*
     * The address routes shipped. `orUnavailable` exists for routes HUGFAB-AI
     * has not built, and wrapping these in it would turn "that address is no
     * longer in your book" into "addresses are not in the app yet" — which is
     * false, and sends the shopper to the website to fix something they could
     * fix here.
     */
    serve(
      {
        error: { code: 'NOT_FOUND', message: 'That address is no longer in your book.' },
      },
      404,
    );
    const failure: unknown = await removeAddress('gone').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(FeatureUnavailableError);
    expect(failure).toHaveProperty('message', 'That address is no longer in your book.');
  });
});
