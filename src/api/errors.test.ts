import { describe, expect, it } from 'vitest';

import {
  ApiAbortError,
  ApiError,
  ApiNetworkError,
  apiErrorFromBody,
  describeError,
  FeatureUnavailableError,
  orUnavailable,
} from './errors';

/**
 * What a failure turns into on screen.
 *
 * This is the layer with the most ways to be quietly wrong: every one of them
 * ends with a person reading a sentence that is true, useless, or misleading,
 * and only the first is acceptable. The cases below are the ones where the
 * difference matters.
 */

describe('apiErrorFromBody', () => {
  it('takes the code and message the API sent', () => {
    const error = apiErrorFromBody(
      { error: { code: 'UNPROCESSABLE', message: 'That size is no longer held.' } },
      422,
      'req_1',
    );
    expect(error.code).toBe('UNPROCESSABLE');
    expect(error.message).toBe('That size is no longer held.');
    expect(error.status).toBe(422);
    expect(error.requestId).toBe('req_1');
  });

  it('falls back to the status when the body is not the envelope', () => {
    // An Nginx 502 page or a Cloudflare challenge is HTML, not our envelope.
    // It still has to become a typed error rather than an undefined read.
    const error = apiErrorFromBody(null, 502, null);
    expect(error.code).toBe('INTERNAL');
    expect(error.message).toBe('HugFab could not answer that just now.');
  });

  it('distrusts a code it does not recognise', () => {
    // A future server code this build has never heard of must not become the
    // string 'TEAPOT' flowing into a switch somewhere.
    const error = apiErrorFromBody(
      { error: { code: 'TEAPOT', message: 'no' } },
      404,
      null,
    );
    expect(error.code).toBe('NOT_FOUND');
  });

  it('maps each documented status to its code', () => {
    const cases: [number, string][] = [
      [400, 'BAD_REQUEST'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [409, 'CONFLICT'],
      [422, 'UNPROCESSABLE'],
      [429, 'RATE_LIMITED'],
      [503, 'NOT_CONFIGURED'],
    ];
    for (const [status, code] of cases) {
      expect(apiErrorFromBody(null, status, null).code).toBe(code);
    }
  });

  it('replaces an empty message rather than showing a blank line', () => {
    const error = apiErrorFromBody(
      { error: { code: 'NOT_FOUND', message: '' } },
      404,
      null,
    );
    expect(error.message).toBe('Not found.');
  });
});

describe('ApiError', () => {
  it('offers field errors from a BAD_REQUEST, for a form', () => {
    const error = new ApiError('BAD_REQUEST', 'Check the form.', 400, {
      fields: { postalCode: ['Enter six digits.'] },
    });
    expect(error.fieldErrors).toEqual({ postalCode: ['Enter six digits.'] });
  });

  it('has no field errors when the details carry none', () => {
    expect(new ApiError('NOT_FOUND', 'Not found.', 404).fieldErrors).toBeNull();
  });

  it('is retryable only where trying again could work', () => {
    // A 409 or a 422 was understood and refused. A Retry button on one of
    // those teaches somebody that buttons do nothing.
    expect(new ApiError('RATE_LIMITED', 'Slow down.', 429).retryable).toBe(true);
    expect(new ApiError('INTERNAL', 'Oops.', 500).retryable).toBe(true);
    expect(new ApiError('CONFLICT', 'Already there.', 409).retryable).toBe(false);
    expect(new ApiError('UNPROCESSABLE', 'No stock.', 422).retryable).toBe(false);
    expect(new ApiError('NOT_FOUND', 'Gone.', 404).retryable).toBe(false);
  });
});

describe('describeError', () => {
  it('says the network failed, not that the request was refused', () => {
    const { message, retryable } = describeError(new ApiNetworkError('nope', null));
    expect(message).toBe('Could not reach HugFab. Check your connection and try again.');
    expect(retryable).toBe(true);
  });

  it('prefers the API sentence over a friendlier one that says less', () => {
    const error = new ApiError('UNPROCESSABLE', 'That size is no longer held.', 422);
    expect(describeError(error).message).toBe('That size is no longer held.');
  });

  it('quotes the request id on a 500, because that is what support can trace', () => {
    const error = new ApiError('INTERNAL', 'Something broke.', 500, null, 'req_9f2');
    expect(describeError(error).message).toBe('Something broke. (reference req_9f2)');
  });

  it('says how long to wait on a rate limit, and pluralises it', () => {
    const many = new ApiError('RATE_LIMITED', 'Slow down.', 429, { retryAfter: 30 });
    expect(describeError(many).message).toBe(
      'Too many requests. Try again in 30 seconds.',
    );

    const one = new ApiError('RATE_LIMITED', 'Slow down.', 429, { retryAfter: 1 });
    expect(describeError(one).message).toBe('Too many requests. Try again in 1 second.');
  });

  it('keeps a plain Error message instead of burying it', () => {
    /*
     * This one regressed once. "Signing in is not available: EXPO_PUBLIC_…"
     * became "Something went wrong", which hid the only useful sentence on the
     * screen from the one person who could act on it.
     */
    const error = new Error(
      'Signing in is not available: EXPO_PUBLIC_SUPABASE_URL unset.',
    );
    expect(describeError(error).message).toBe(
      'Signing in is not available: EXPO_PUBLIC_SUPABASE_URL unset.',
    );
  });

  it('falls back only when there is genuinely nothing to say', () => {
    expect(describeError({}).message).toBe('Something went wrong.');
    expect(describeError(new Error('')).message).toBe('Something went wrong.');
  });

  it('does not offer Retry on a feature that does not exist yet', () => {
    const error = new FeatureUnavailableError('Your bag', '/cart');
    const { message, retryable } = describeError(error);
    expect(message).toBe(
      'Your bag is not in the app yet. It works on the HugFab website.',
    );
    expect(retryable).toBe(false);
  });
});

describe('orUnavailable', () => {
  it('turns a gap route 404 into a sentence a shopper can act on', async () => {
    const notFound = Promise.reject(new ApiError('NOT_FOUND', 'Not found.', 404));
    await expect(orUnavailable(notFound, 'Your bag', '/cart')).rejects.toBeInstanceOf(
      FeatureUnavailableError,
    );
  });

  it('lets a 401 through unchanged', async () => {
    /*
     * The case that matters. "Sign in" and "not built yet" are different
     * answers and only one of them is the shopper's to act on — telling
     * someone their wishlist is coming soon when they are simply signed out
     * sends away a person who was one tap from using it.
     */
    const unauthorised = Promise.reject(
      new ApiError('UNAUTHORIZED', 'You need to be signed in to do that.', 401),
    );
    await expect(orUnavailable(unauthorised, 'Your bag', '/cart')).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('lets a network failure through, so Retry is still offered', async () => {
    const offline = Promise.reject(new ApiNetworkError('nope', null));
    await expect(orUnavailable(offline, 'Your bag', '/cart')).rejects.toBeInstanceOf(
      ApiNetworkError,
    );
  });

  it('passes a success straight through', async () => {
    await expect(
      orUnavailable(Promise.resolve({ items: [] }), 'x', '/x'),
    ).resolves.toEqual({
      items: [],
    });
  });

  it('carries the web path, so the screen can offer the page that works', async () => {
    try {
      await orUnavailable(
        Promise.reject(new ApiError('NOT_FOUND', 'Not found.', 404)),
        'Your wishlist',
        '/wishlist',
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as FeatureUnavailableError).webPath).toBe('/wishlist');
    }
  });
});

describe('ApiAbortError', () => {
  it('is not an error worth showing loudly', () => {
    expect(describeError(new ApiAbortError()).message).toBe('Cancelled.');
  });
});
