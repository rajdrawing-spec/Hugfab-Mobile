/**
 * The AI stylist. `POST /api/stylist` is live in HUGFAB-AI today.
 *
 * Harder rate-limited than a search (`RATE_LIMITS.ai`, 20/min) because every
 * call spends money at a model provider — so this is never called on a keystroke
 * and never retried automatically.
 *
 * Two refusals arrive as ordinary HTTP errors and both are things the person can
 * act on, so neither is swallowed: `UNAUTHORIZED` means sign in, `FORBIDDEN`
 * means the credits are spent. The route is explicit that showing "something
 * went wrong" for either sends away somebody who was about to buy.
 */

import { apiFetch } from './client';
import type { StylistReply, StylistTurn } from './types';

/** History is capped at 20 turns server-side; sending more is a 400. */
export const MAX_HISTORY = 20;

export function askStylist(
  message: string,
  history: readonly StylistTurn[] = [],
): Promise<StylistReply> {
  return apiFetch<StylistReply>({
    path: '/api/stylist',
    method: 'POST',
    body: { message, history: history.slice(-MAX_HISTORY) },
  });
}
