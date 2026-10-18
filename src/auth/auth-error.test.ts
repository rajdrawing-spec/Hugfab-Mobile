/**
 * The sentence a failed sign-in puts on screen.
 *
 * Two properties, and they pull in opposite directions, which is why both are
 * pinned here: a transport failure must be reworded into the app's own
 * sentence, and every other auth error must survive untouched. Widen the first
 * and "Invalid login credentials" becomes "check your connection", which is
 * both wrong and the start of telling people which addresses are registered.
 *
 * The errors below are shaped exactly as auth-js builds them
 * (`@supabase/auth-js/dist/module/lib/errors.js`): `__isAuthError`, a `name`,
 * and a `status` that is 0 when `fetch` itself threw.
 */

import { describe, expect, it } from 'vitest';

import { NETWORK_MESSAGE } from '@/api/errors';
import { authErrorMessage } from './auth-error';

function authError(name: string, message: string, status: number): Error {
  const error = new Error(message) as Error & {
    __isAuthError: boolean;
    name: string;
    status: number;
  };
  error.__isAuthError = true;
  error.name = name;
  error.status = status;
  return error;
}

describe('a failure to reach Supabase at all', () => {
  it('speaks the same sentence the rest of the app uses', () => {
    // What a phone with no signal actually produces, via auth-js.
    const offline = authError('AuthRetryableFetchError', 'Network request failed', 0);

    expect(authErrorMessage(offline)).toBe(NETWORK_MESSAGE);
  });

  it('says the same for a browser, whose wording differs', () => {
    const web = authError('AuthRetryableFetchError', 'Failed to fetch', 0);

    expect(authErrorMessage(web)).toBe(NETWORK_MESSAGE);
  });

  it('distinguishes the auth server failing from the connection failing', () => {
    // status 5xx: the request arrived. Telling somebody to check their
    // connection would send them to reset a router that is working.
    const down = authError('AuthRetryableFetchError', 'Bad Gateway', 502);
    const message = authErrorMessage(down);

    expect(message).not.toBe(NETWORK_MESSAGE);
    expect(message).not.toBe('Bad Gateway');
    expect(message).toMatch(/try again/i);
  });
});

describe('every other auth error', () => {
  /**
   * The one that must not be touched. Supabase is deliberately vague about
   * whether the address exists; a friendlier rewording here is how an app
   * becomes an account-enumeration oracle.
   */
  it('passes an invalid password through exactly as Supabase worded it', () => {
    const refused = authError('AuthApiError', 'Invalid login credentials', 400);

    expect(authErrorMessage(refused)).toBe('Invalid login credentials');
  });

  it('passes a rate limit through, because it says what to do', () => {
    const limited = authError(
      'AuthApiError',
      'For security purposes, you can only request this after 48 seconds.',
      429,
    );

    expect(authErrorMessage(limited)).toBe(
      'For security purposes, you can only request this after 48 seconds.',
    );
  });

  it('keeps a plain Error, which is usually a configuration sentence', () => {
    expect(authErrorMessage(new Error('Signing in is not available.'))).toBe(
      'Signing in is not available.',
    );
  });

  it('falls back rather than rendering an empty banner', () => {
    expect(authErrorMessage(new Error(''))).toBe('Could not sign in.');
    expect(authErrorMessage(null)).toBe('Could not sign in.');
    expect(authErrorMessage(undefined)).toBe('Could not sign in.');
    expect(authErrorMessage({ nothing: true })).toBe('Could not sign in.');
  });

  it('reads a message off a plain object, which is what a mocked client returns', () => {
    expect(authErrorMessage({ message: 'Email not confirmed' })).toBe(
      'Email not confirmed',
    );
  });
});
