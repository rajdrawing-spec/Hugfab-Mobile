/**
 * The shopper's address book.
 *
 * Every call here is a route that exists on HUGFAB-AI `main` — so, unlike
 * `src/api/account.ts`'s wishlist and orders, **nothing is wrapped in
 * `orUnavailable`**. These are not gap routes, and turning a genuine 404 from
 * them into "not in the app yet" would be a lie: a 404 on `PATCH /[id]` means
 * that address is gone, which is a thing the shopper needs to be told plainly.
 *
 * Three things about the contract are worth stating here rather than leaving to
 * whoever reads the route next:
 *
 * 1. **Every write returns the whole book.** `saveAddress`, `removeAddress` and
 *    `makeDefault` all answer with `addresses`, already reordered and with
 *    `isDefault` settled. So a screen replaces its cache with the response
 *    instead of patching a row and re-sorting — the server has already decided
 *    what the book looks like, including the rules this app must not reimplement
 *    (the first address saved becomes the default; deleting the default promotes
 *    the next one).
 * 2. **Validation is the web app's.** The route passes the body to `saveAddress`
 *    unparsed on purpose, so that checkout's schema is the only definition of a
 *    valid address. This module does not check the PIN or the mobile number; it
 *    sends them and renders what comes back, which is `BAD_REQUEST` with
 *    `details.fields`.
 * 3. **An update is a save with an id.** There is one service call behind POST
 *    and PATCH, which is why there is no separate `createAddress` here either.
 */

import { apiFetch } from './client';
import type { AddressBook, AddressInput, SavedAddress } from './types';

/** What every write answers with: the row that changed, and the whole book. */
export interface AddressSaved {
  address: SavedAddress;
  addresses: SavedAddress[];
}

export function getAddressBook(signal?: AbortSignal): Promise<AddressBook> {
  return apiFetch<AddressBook>({ path: '/api/account/addresses', signal });
}

export function createAddress(input: AddressInput): Promise<AddressSaved> {
  return apiFetch<AddressSaved>({
    path: '/api/account/addresses',
    method: 'POST',
    body: input,
  });
}

/**
 * The id goes in the path, not the body. The route puts it into the body itself
 * — `saveAddress({ ...body, id })` — so one sent in the body would be
 * overwritten by the path's anyway, and sending both invites a mismatch nobody
 * would notice until the wrong address changed.
 */
export function updateAddress(id: string, input: AddressInput): Promise<AddressSaved> {
  return apiFetch<AddressSaved>({
    path: `/api/account/addresses/${encodeURIComponent(id)}`,
    method: 'PATCH',
    body: input,
  });
}

export function removeAddress(
  id: string,
): Promise<{ removed: boolean; addresses: SavedAddress[] }> {
  return apiFetch<{ removed: boolean; addresses: SavedAddress[] }>({
    path: `/api/account/addresses/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}

/**
 * Its own route rather than `PATCH { isDefault: true }`, and the route says why:
 * choosing the default is one intention, and folding it into a general update
 * means a client changing a postcode has to remember to send `isDefault` too or
 * silently clear it.
 */
export function makeDefaultAddress(
  id: string,
): Promise<{ defaultId: string; addresses: SavedAddress[] }> {
  return apiFetch<{ defaultId: string; addresses: SavedAddress[] }>({
    path: `/api/account/addresses/${encodeURIComponent(id)}/default`,
    method: 'POST',
  });
}
