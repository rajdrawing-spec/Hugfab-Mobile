/**
 * The Bag. Every route here is `docs/API-GAPS.md` §3 and answers 404 today.
 *
 * Two things this module will not do, and the reasons are the point:
 *
 * - It never totals the lines. `subtotal` is the database's figure, computed from
 *   `prices` rather than from anything a client sent. Summing `lineTotal` here
 *   would agree with the server right up until a promotion, a deal hold or an
 *   unavailable line made it disagree silently.
 * - It never decides whether a line can be bought. `available` is the server's
 *   answer to a question involving stock holds this app cannot see.
 *
 * A write returns the whole new cart, so one round trip updates the lines, the
 * totals and the tab badge — and the server stays the only thing that computed
 * any of them.
 */

import { apiFetch } from './client';
import { orUnavailable } from './errors';
import type { Cart } from './types';

const FEATURE = 'Your bag';
const WEB_PATH = '/cart';

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return orUnavailable(apiFetch<Cart>({ path: '/api/cart', signal }), FEATURE, WEB_PATH);
}

export function addCartItem(variantId: string, quantity = 1): Promise<Cart> {
  return orUnavailable(
    apiFetch<Cart>({
      path: '/api/cart/items',
      method: 'POST',
      body: { variantId, quantity },
    }),
    'Adding to your bag',
    WEB_PATH,
  );
}

/** Zero removes the line — the service's own behaviour, not a convention here. */
export function setCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  return orUnavailable(
    apiFetch<Cart>({
      path: `/api/cart/items/${encodeURIComponent(itemId)}`,
      method: 'PATCH',
      body: { quantity },
    }),
    'Changing your bag',
    WEB_PATH,
  );
}
