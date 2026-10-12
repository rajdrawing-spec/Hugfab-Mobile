/**
 * Asking for a password reset link.
 *
 * THE ANSWER IS THE SAME WHETHER OR NOT THE ACCOUNT EXISTS
 * --------------------------------------------------------
 * This function resolves on failure. That is not sloppiness and it is not a
 * swallowed error to be tidied up later — it is the whole security property, and
 * it is ported deliberately from HUGFAB-AI `src/app/(auth)/forgot-password/
 * forgot-form.tsx`, whose own comment says it best:
 *
 *   > A form that says "no account with that email" is an account-enumeration
 *   > oracle: anyone can walk a list of addresses through it and learn who shops
 *   > here.
 *
 * Supabase already answers `resetPasswordForEmail` identically for a registered
 * and an unregistered address. The leak a client introduces is *branching* on
 * what comes back — so nothing here branches, and the screen shows one sentence
 * for every outcome. A rate-limit refusal must not leak either: "too many
 * requests for this address" tells an attacker the address was worth limiting.
 *
 * The cost is real and worth naming: a genuine outage looks exactly like
 * success, so somebody can wait for an email that was never sent. The web app
 * accepted that trade, and the two should not disagree about who is registered.
 *
 * WHERE THE LINK GOES
 * -------------------
 * To the website, not back into the app. `redirectTo` is the web app's own
 * `/reset-password`, which exchanges Supabase's one-time code for a short-lived
 * recovery session and takes the new password.
 *
 * It could in principle be an `exp://` or a custom scheme pointing here, and
 * that is Phase 2 work behind `eas build`: in Expo Go the scheme changes with
 * the host machine's address, so a link minted on one laptop is dead everywhere
 * else — and this one arrives by email, minutes later, on whatever device the
 * person reads mail on. A link that works for the developer who built it and
 * nobody else is worse than one that honestly opens a browser. The screen says
 * so rather than implying the reset finishes in the app.
 */

/**
 * Only the part of the client this needs, written out rather than imported.
 * `eslint.config.js` lets `src/lib/supabase.ts` import `@supabase/supabase-js`
 * and nothing else — see the note in `sign-out.ts`. The shape is structural, so
 * the real `supabase.auth` satisfies it.
 */
interface Auth {
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<{ error: { message: string } | null }>;
}

/**
 * Where the emailed link lands: the web app's reset page, on the canonical host.
 *
 * Absolute and derived from the configured API base rather than hardcoded, so a
 * staging build sends people to staging's reset page instead of production's.
 */
export function resetRedirectUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/reset-password`;
}

/**
 * Request the email. **Always resolves** — see the note above. Never report the
 * outcome of this to the person; there is nothing in it they are entitled to
 * know that an attacker is not.
 */
export async function requestPasswordReset(
  auth: Auth,
  email: string,
  apiBaseUrl: string,
): Promise<void> {
  try {
    await auth.resetPasswordForEmail(email.trim(), {
      redirectTo: resetRedirectUrl(apiBaseUrl),
    });
  } catch {
    /*
     * Deliberately swallowed, like the web app's. A thrown error here is a
     * network failure or a rate limit, and distinguishing either one on screen
     * from "that address is not registered" is the leak this file exists to
     * prevent.
     */
  }
}
