/**
 * The Bag, and the order it becomes.
 *
 * These routes are live as of HUGFAB-AI's `claude/mobile-cart-option-a`:
 * option A of `docs/API-GAPS.md` §3, a cart keyed on the signed-in user
 * because a phone cannot hold the httpOnly cookie the website's cart uses.
 * Signing in is therefore required to use the Bag, and only the Bag — browsing
 * stays anonymous.
 *
 * Two things this module will not do, and the reasons are the point:
 *
 * - It never totals the lines. `subtotal` is the database's figure, computed
 *   from `prices` rather than from anything a client sent. Summing `lineTotal`
 *   here would agree with the server right up until a promotion, a deal hold or
 *   an unavailable line made it disagree silently.
 * - It never decides whether a line can be bought. `available` is the server's
 *   answer to a question involving stock holds this app cannot see.
 *
 * A write returns the whole new cart, so one round trip updates the lines, the
 * totals and the tab badge — and the server stays the only thing that computed
 * any of them.
 *
 * WHERE `orUnavailable` IS AND IS NOT USED
 * ----------------------------------------
 * Only on `GET /api/cart`. That route cannot answer `NOT_FOUND` for a
 * signed-in caller — an empty bag is an empty cart, not a 404 — so a 404 there
 * means the deployment does not have these routes yet, and "not in the app
 * yet" is the true thing to say.
 *
 * On the item and deal routes a 404 is a real answer with a real meaning: that
 * line is not in your bag. Wrapping those would tell a shopper the Bag is
 * coming soon because they double-tapped remove. Same reasoning as
 * `src/api/dashboard.ts`, opposite conclusion, for the opposite reason.
 */

import { apiFetch } from './client';
import { orUnavailable } from './errors';
import type { Cart, PlacedOrder } from './types';

const FEATURE = 'Your bag';
const WEB_PATH = '/cart';

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return orUnavailable(apiFetch<Cart>({ path: '/api/cart', signal }), FEATURE, WEB_PATH);
}

export function addCartItem(variantId: string, quantity = 1): Promise<Cart> {
  return apiFetch<Cart>({
    path: '/api/cart/items',
    method: 'POST',
    body: { variantId, quantity },
  });
}

/** Zero removes the line — the service's own behaviour, not a convention here. */
export function setCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  return apiFetch<Cart>({
    path: `/api/cart/items/${encodeURIComponent(itemId)}`,
    method: 'PATCH',
    body: { quantity },
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return apiFetch<Cart>({
    path: `/api/cart/items/${encodeURIComponent(itemId)}`,
    method: 'DELETE',
  });
}

/**
 * A HUGFAB Deal goes in whole: `variantIds` are the shopper's choices for each
 * slot, and the server decides whether that combination is still buyable at the
 * deal price.
 */
export function addCartDeal(dealId: string, variantIds: string[]): Promise<Cart> {
  return apiFetch<Cart>({
    path: '/api/cart/deals',
    method: 'POST',
    body: { dealId, variantIds },
  });
}

/** And comes out whole: half a bundle has no price. */
export function removeCartDeal(cartDealId: string): Promise<Cart> {
  return apiFetch<Cart>({
    path: `/api/cart/deals/${encodeURIComponent(cartDealId)}`,
    method: 'DELETE',
  });
}

/**
 * What a checkout needs. The same fields the website's form asks for, because
 * it is the same schema on the other side — `line2` is required-but-may-be-empty
 * for the same reason it is in `AddressInput`.
 *
 * No amount appears here, deliberately. The total is computed by the database
 * from live prices; a client that could send one could choose what to pay.
 */
export interface CheckoutInput {
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  promotionCode?: string;
  usePoints?: boolean;
  useWallet?: boolean;
  notifySms?: boolean;
  notifyWhatsapp?: boolean;
}

/**
 * Places the order. It comes back **awaiting payment**, and `payUrl` is where
 * the shopper pays — the website's own page for this order id.
 *
 * Not wrapped in `orUnavailable`: a failure here is a real refusal with a real
 * sentence ("your bag is empty", a field error), and a shopper who has filled
 * in a delivery address must not be told checkout is coming soon.
 */
export function placeOrder(input: CheckoutInput): Promise<PlacedOrder> {
  return apiFetch<PlacedOrder>({ path: '/api/checkout', method: 'POST', body: input });
}
