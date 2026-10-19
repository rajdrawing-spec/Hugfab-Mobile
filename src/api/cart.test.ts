import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The requests the Bag builds, and which failures it is allowed to soften.
 *
 * **These do not test the API.** `fetch` is stubbed, so nothing here proves
 * HugFab's cart routes answer in any particular shape. What is under test is
 * this app's half of the contract: the method, where an id goes, that no price
 * is ever sent, and the one decision with teeth — which routes treat a 404 as
 * "not built yet" and which treat it as an answer.
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
  addCartDeal,
  addCartItem,
  getCart,
  placeOrder,
  removeCartDeal,
  removeCartItem,
  setCartItemQuantity,
} = await import('./cart');
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

function sentBody(): Record<string, unknown> {
  const raw = calls[0]?.init.body;
  return typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

const EMPTY = {
  data: {
    lines: [],
    deals: [],
    subtotal: { amountMinor: 0, currency: 'INR' },
    itemCount: 0,
    lineCount: 0,
    unavailable: 0,
    currency: 'INR',
  },
};

const notFound = {
  error: { code: 'NOT_FOUND', message: 'That line is not in your bag.' },
};

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reading the bag', () => {
  it('sends the bearer token and asks for the cart', async () => {
    serve(EMPTY);

    await getCart();

    expect(calls[0]?.url).toBe('https://hugfab.test/api/cart');
    expect(new Headers(calls[0]?.init.headers).get('Authorization')).toBe(
      'Bearer token-abc',
    );
  });

  /**
   * `GET /api/cart` cannot answer 404 for a signed-in caller — an empty bag is
   * an empty cart, not a missing one — so a 404 here means the deployment does
   * not have these routes yet, and saying "not in the app yet" is true.
   */
  it('reads a 404 as a deployment without the routes', async () => {
    serve(notFound, 404);

    await expect(getCart()).rejects.toBeInstanceOf(FeatureUnavailableError);
  });
});

describe('changing the bag', () => {
  it('posts a variant and a quantity, and never a price', async () => {
    serve(EMPTY, 201);

    await addCartItem('11111111-1111-4111-8111-111111111111', 2);

    expect(calls[0]?.init.method).toBe('POST');
    expect(sentBody()).toEqual({
      variantId: '11111111-1111-4111-8111-111111111111',
      quantity: 2,
    });
  });

  it('puts the line id in the path, escaped, and the quantity in the body', async () => {
    serve(EMPTY);

    await setCartItemQuantity('item/1', 3);

    expect(calls[0]?.url).toBe('https://hugfab.test/api/cart/items/item%2F1');
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(sentBody()).toEqual({ quantity: 3 });
  });

  it('removes with DELETE and no body', async () => {
    serve(EMPTY);

    await removeCartItem('item-1');

    expect(calls[0]?.init.method).toBe('DELETE');
    expect(calls[0]?.init.body).toBeUndefined();
  });

  /**
   * The decision this file exists to lock down. On a line route a 404 is the
   * server's answer — that line is not in your bag — and softening it into
   * "the Bag is coming soon" would be a lie told to somebody who double-tapped
   * remove.
   */
  it('lets a 404 from a line route reach the screen as a 404', async () => {
    serve(notFound, 404);

    const failure = await setCartItemQuantity('item-1', 1).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(FeatureUnavailableError);
    expect(failure).toHaveProperty('message', 'That line is not in your bag.');
  });
});

describe('deals', () => {
  it('adds a deal whole, with every chosen variant', async () => {
    serve(EMPTY, 201);

    await addCartDeal('deal-1', ['v1', 'v2']);

    expect(calls[0]?.url).toBe('https://hugfab.test/api/cart/deals');
    expect(sentBody()).toEqual({ dealId: 'deal-1', variantIds: ['v1', 'v2'] });
  });

  it('removes a deal by its cart deal id, escaped', async () => {
    serve(EMPTY);

    await removeCartDeal('cart/deal');

    expect(calls[0]?.url).toBe('https://hugfab.test/api/cart/deals/cart%2Fdeal');
    expect(calls[0]?.init.method).toBe('DELETE');
  });
});

describe('placing the order', () => {
  const input = {
    email: 'asha@example.com',
    name: 'Asha Menon',
    phone: '9876543210',
    line1: 'Flat 201, Sunrise Apartments',
    line2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560102',
  };

  it('sends the address and nothing resembling a total', async () => {
    serve({
      data: {
        orderId: 'o-1',
        orderNumber: 'HF-1',
        total: { amountMinor: 189900, currency: 'INR' },
        payable: { amountMinor: 189900, currency: 'INR' },
        discount: { amountMinor: 0, currency: 'INR' },
        pointsApplied: { amountMinor: 0, currency: 'INR' },
        walletApplied: { amountMinor: 0, currency: 'INR' },
        payUrl: 'https://hugfab.test/checkout/o-1',
      },
    });

    const order = await placeOrder(input);

    expect(calls[0]?.url).toBe('https://hugfab.test/api/checkout');
    expect(sentBody()).toEqual(input);
    expect(Object.keys(sentBody())).not.toContain('total');
    expect(order.payUrl).toBe('https://hugfab.test/checkout/o-1');
  });

  /** An empty `line2` must survive: the schema requires the key, not a value. */
  it('keeps an empty line2 rather than dropping the key', async () => {
    serve({ data: { orderId: 'o-1' } });

    await placeOrder(input);

    expect(sentBody()).toHaveProperty('line2', '');
  });

  it('does not soften a refusal into "coming soon"', async () => {
    serve({ error: { code: 'UNPROCESSABLE', message: 'Your bag is empty.' } }, 422);

    const failure = await placeOrder(input).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(FeatureUnavailableError);
    expect(failure).toHaveProperty('message', 'Your bag is empty.');
  });
});
