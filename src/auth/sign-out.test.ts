import { describe, expect, it } from 'vitest';

import { signOutThisDevice } from './sign-out';

/** Records what scope the caller asked for. */
function auth(error: { message: string } | null = null) {
  const calls: unknown[] = [];
  return {
    calls,
    signOut: (options?: unknown) => {
      calls.push(options);
      return Promise.resolve({ error } as never);
    },
  };
}

describe('signing out of this device', () => {
  it('asks for the local scope, never the default', async () => {
    /*
     * The whole bug. `signOut()` with no argument defaults to 'global' and
     * revokes every refresh token the account holds. Tapping Sign out in the
     * app would end the shopper's session on hugfab.com and on every other
     * device they own, which reads from the other end as being kicked out.
     */
    const a = auth();
    await signOutThisDevice(a as never);
    expect(a.calls).toEqual([{ scope: 'local' }]);
  });

  it('never passes undefined, which would take the global default back', async () => {
    const a = auth();
    await signOutThisDevice(a as never);
    expect(a.calls[0]).toBeDefined();
    expect(a.calls[0]).not.toBeUndefined();
  });

  it('throws when Supabase refuses, rather than reporting a sign-out that did not happen', async () => {
    // A screen that navigates to the signed-out state on a failed sign-out
    // leaves a live session behind on a phone somebody has just handed back.
    const a = auth({ message: 'network down' });
    await expect(signOutThisDevice(a as never)).rejects.toMatchObject({
      message: 'network down',
    });
  });
});
