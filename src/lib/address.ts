/**
 * Writing an address out on one line.
 *
 * Ported from HUGFAB-AI `src/modules/addresses/types.ts`, for the same reason
 * `money.ts` is ported rather than reimplemented: this is presentation, and
 * presentation of a shared shape should read identically on the phone and on the
 * website. A shopper comparing the two should not have to wonder whether they
 * are looking at the same saved address.
 *
 * It decides nothing. No field is inferred, no missing line is invented, and an
 * address that arrives half-empty comes out half-empty rather than padded.
 */

import type { AddressKind, SavedAddress } from '@/api/types';

/**
 * "Flat 201, Sunrise Apartments, HSR Layout, Bengaluru, Karnataka – 560102".
 *
 * The filter is the web app's and matters: an address with no `line2` must not
 * leave a stranded ", ," in the middle, and one with neither state nor PIN must
 * not end on a bare en dash.
 */
export function formatAddress(
  a: Pick<SavedAddress, 'line1' | 'line2' | 'city' | 'state' | 'postalCode'>,
): string {
  return [a.line1, a.line2, a.city, `${a.state} – ${a.postalCode}`]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0 && part !== '–')
    .join(', ');
}

/** The three kinds, in the order the form offers them. */
export const ADDRESS_KINDS: readonly { value: AddressKind; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * A ten-digit mobile as "98765 43210".
 *
 * Display only, and only for a number already the shape the server stores —
 * the schema strips `+91` and any leading `0` before saving, so anything else
 * here is passed through untouched rather than coerced into a shape it is not.
 */
export function formatPhone(phone: string): string {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}
