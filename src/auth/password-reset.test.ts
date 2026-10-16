import { describe, expect, it } from 'vitest';

import { requestPasswordReset, resetRedirectUrl } from './password-reset';

/**
 * These tests exist for one property: **this function must not tell the caller
 * what happened.** Resolving on failure looks like a swallowed error and the
 * obvious "fix" is to rethrow it — so the reason is written down in
 * `password-reset.ts` and pinned here, where a change to it fails a test
 * instead of quietly reintroducing an account-enumeration oracle.
 */

/** Records the call, and optionally fails the way Supabase would. */
function auth(outcome?: { error?: { message: string }; throws?: Error }) {
  const calls: { email: string; redirectTo: string }[] = [];
  return {
    calls,
    resetPasswordForEmail: (email: string, options: { redirectTo: string }) => {
      calls.push({ email, redirectTo: options.redirectTo });
      if (outcome?.throws) return Promise.reject(outcome.throws);
      return Promise.resolve({ error: outcome?.error ?? null });
    },
  };
}

describe('requesting a reset link', () => {
  it('asks Supabase, pointing the link at the website', async () => {
    const a = auth();
    await requestPasswordReset(a as never, 'asha@example.com', 'https://hugfab.com');
    expect(a.calls).toEqual([
      { email: 'asha@example.com', redirectTo: 'https://hugfab.com/reset-password' },
    ]);
  });

  it('trims the address, so a pasted one with a space still works', async () => {
    const a = auth();
    await requestPasswordReset(a as never, '  asha@example.com \n', 'https://hugfab.com');
    expect(a.calls[0]?.email).toBe('asha@example.com');
  });

  it('resolves when Supabase returns an error, rather than reporting it', async () => {
    /*
     * The security property. Supabase answers the same way for a registered and
     * an unregistered address, so the only way a client leaks which is which is
     * by branching on the result. This resolves, the screen says "check your
     * email", and nobody can walk a list of addresses through it.
     */
    const a = auth({ error: { message: 'User not found' } });
    await expect(
      requestPasswordReset(a as never, 'nobody@example.com', 'https://hugfab.com'),
    ).resolves.toBeUndefined();
  });

  it('resolves when the request throws, so a rate limit does not leak either', async () => {
    // "Too many requests for this address" tells an attacker the address was
    // worth rate-limiting, which is the same oracle by a slower route.
    const a = auth({ throws: new Error('rate limit exceeded') });
    await expect(
      requestPasswordReset(a as never, 'asha@example.com', 'https://hugfab.com'),
    ).resolves.toBeUndefined();
  });
});

describe('where the emailed link lands', () => {
  it('is the reset page on the configured host, not a hardcoded one', () => {
    // So a staging build sends people to staging's reset page. Hardcoding
    // production here would have a tester setting a password on the live site.
    expect(resetRedirectUrl('https://staging.hugfab.com')).toBe(
      'https://staging.hugfab.com/reset-password',
    );
  });

  it('does not double the slash when the base URL has a trailing one', () => {
    expect(resetRedirectUrl('https://hugfab.com/')).toBe(
      'https://hugfab.com/reset-password',
    );
  });
});
