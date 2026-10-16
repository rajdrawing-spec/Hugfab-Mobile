/**
 * Signing out of this phone, and only this phone.
 *
 * THE DEFAULT SCOPE IS `global`, AND THAT WAS THE BUG
 * ---------------------------------------------------
 * `supabase.auth.signOut()` with no argument revokes **every** refresh token
 * the account holds, on every device. The library's own source says so:
 *
 *     async signOut(options = { scope: 'global' }) {
 *     // Warning: the default `scope` is 'global'. This signs the user out of
 *     // all sessions/devices.
 *
 * On a phone that is worse than on a laptop. Tapping Sign out in the app ends
 * the shopper's session on hugfab.com, on their tablet, and anywhere else they
 * were signed in — which reads from the other end as being kicked out for no
 * reason. Nothing in this app ever meant to limit a person to one session;
 * `signInWithPassword` issues an independent one per device, as Supabase
 * intends. They were not being prevented, they were being destroyed on the way
 * out.
 *
 * Ported from HUGFAB-AI `src/lib/sign-out.ts`, which fixed the same default on
 * the web. Keeping the two the same matters here: a shopper who signs out on
 * the phone and a shopper who signs out on the website should mean the same
 * thing by it.
 *
 * The counterpart, `signOut({ scope: 'others' })`, is below. It was left out
 * at first because it belongs beside a password reset — "sign out everywhere
 * else" is what somebody reaches for when they think an account is
 * compromised, and it is half an answer without a way to change the password.
 * `password-reset.ts` is the other half, so it is here now.
 */

/**
 * Only the part of the client this needs, written out rather than imported.
 *
 * `eslint.config.js` lets `src/lib/supabase.ts` import `@supabase/supabase-js`
 * and nothing else, so that data cannot quietly start arriving through the
 * Supabase client instead of the API. A type-only import would still trip it,
 * and the rule is worth more intact than this one line is worth saving. The
 * shape is structural, so the real `supabase.auth` satisfies it.
 */
interface Auth {
  signOut(options: {
    scope: 'local' | 'others';
  }): Promise<{ error: { message: string } | null }>;
}

/**
 * Ends this device's session and no other. What a Sign out button means.
 *
 * The scope is always passed explicitly. Passing `undefined` would take the
 * global default back, which is the bug this file exists to prevent.
 */
export async function signOutThisDevice(auth: Auth): Promise<void> {
  const { error } = await auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/**
 * Ends every *other* session and keeps this one. What somebody reaches for
 * after losing a phone, or after signing in on a friend's laptop and not
 * remembering whether they signed out.
 *
 * `'others'`, never `'global'`. Global would revoke this device's token too,
 * which means the person who just asked to secure their account is handed a
 * sign-in screen — and the one device they are holding, and trust, is the one
 * they would then have to re-authenticate on. The phone keeps its session and
 * everything else loses one.
 *
 * Unlike `requestPasswordReset`, failure here **is** reported. There is no
 * enumeration concern — this is an authenticated action on the caller's own
 * account — and silence would be dangerous in the other direction: somebody
 * told "done" while a stolen laptop is still signed in has been actively
 * misinformed about the thing they were worried about.
 */
export async function signOutOtherDevices(auth: Auth): Promise<void> {
  const { error } = await auth.signOut({ scope: 'others' });
  if (error) throw error;
}
