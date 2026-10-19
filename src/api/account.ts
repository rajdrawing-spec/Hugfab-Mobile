/**
 * The signed-in shopper's own data.
 *
 * `GET /api/account/summary` exists; the rest are `docs/API-GAPS.md` and answer
 * 404 until they ship, which `orUnavailable` turns into a sentence a shopper can
 * act on.
 */

import { apiFetch } from './client';
import { orUnavailable } from './errors';
import type { AccountSummary, OrderDetail, OrderSummary, WishlistItem } from './types';

/**
 * `data` is null for a visitor who is not signed in — a 200, not a 401, because
 * "nobody is signed in" is an answer rather than an error.
 */
export function getAccountSummary(signal?: AbortSignal): Promise<AccountSummary | null> {
  return apiFetch<AccountSummary | null>({ path: '/api/account/summary', signal });
}

export function listWishlist(signal?: AbortSignal): Promise<{ items: WishlistItem[] }> {
  return orUnavailable(
    apiFetch<{ items: WishlistItem[] }>({ path: '/api/wishlist', signal }),
    'Your wishlist',
    '/wishlist',
  );
}

export function addToWishlist(productId: string): Promise<{ saved: boolean }> {
  return orUnavailable(
    apiFetch<{ saved: boolean }>({
      path: '/api/wishlist',
      method: 'POST',
      body: { productId },
    }),
    'Saving to your wishlist',
    '/wishlist',
  );
}

export function removeFromWishlist(productId: string): Promise<{ saved: boolean }> {
  return orUnavailable(
    apiFetch<{ saved: boolean }>({
      path: `/api/wishlist/${encodeURIComponent(productId)}`,
      method: 'DELETE',
    }),
    'Removing from your wishlist',
    '/wishlist',
  );
}

export function listOrders(signal?: AbortSignal): Promise<{ orders: OrderSummary[] }> {
  return orUnavailable(
    apiFetch<{ orders: OrderSummary[] }>({ path: '/api/orders', signal }),
    'Your orders',
    '/account/orders',
  );
}

export function getOrder(orderId: string, signal?: AbortSignal): Promise<OrderDetail> {
  return orUnavailable(
    apiFetch<OrderDetail>({
      path: `/api/orders/${encodeURIComponent(orderId)}`,
      signal,
    }),
    'This order',
    '/account/orders',
  );
}

/**
 * Closes the account, for good.
 *
 * Required by both stores for an app that creates accounts, and the one call
 * here with nothing behind it: there is no undo, no grace period and no
 * reopening. The server deletes the auth user, which is what signs every
 * device out and carries the database's own rules about what is kept.
 *
 * Deliberately **not** wrapped in `orUnavailable`. A 404 is impossible for a
 * signed-in caller, and every other failure here is a real one a person must
 * read — above all `UNPROCESSABLE`, which means a record the shop keeps on
 * purpose is in the way and a human has to finish the job.
 *
 * `confirm` is the literal word, typed by the person on the screen before
 * this. It guards against a misplaced tap, not against an impostor.
 */
export function deleteAccount(): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>({
    path: '/api/account/delete',
    method: 'POST',
    body: { confirm: 'DELETE' },
  });
}
