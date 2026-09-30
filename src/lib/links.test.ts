import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Where an outbound tap actually goes.
 *
 * Two of these guard a bug that shipped once and would have shipped again:
 * `openWebPage` prefixes the HugFab base, so handing it a courier's absolute
 * URL produced `https://hugfab.com/https://courier.example/track/…` — a dead
 * link on the one screen where a person is anxious about a parcel.
 */

vi.mock('@/lib/env', () => ({
  env: { apiBaseUrl: 'https://hugfab.test', supabaseUrl: null, supabaseAnonKey: null },
  features: { api: true, auth: false },
  missingConfigMessage: () => null,
}));

// `@/api/client` pulls in `@/lib/supabase`, which pulls in React Native. None
// of it is exercised here, so it is cut off at the import.
vi.mock('@/lib/supabase', () => ({
  accessToken: () => Promise.resolve(null),
  refreshAccessToken: () => Promise.resolve(null),
  supabase: null,
  startSessionRefresh: () => () => undefined,
}));

vi.mock('@/theme', () => ({
  color: () => '#000000',
  elevation: () => ({}),
}));

const opened: string[] = [];

vi.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string) => {
    opened.push(url);
    return Promise.resolve({ type: 'opened' });
  },
}));

const { openClickOut, openExternal, openWebPage } = await import('./links');

beforeEach(() => {
  opened.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('openClickOut', () => {
  it('opens HugFab own redirect, so attribution is recorded', async () => {
    // The retailer's tracked URL is never exposed to this app. clickPath is
    // the only thing to open, and it has to be opened rather than fetched:
    // the 302 is where the commission is credited.
    await openClickOut('/api/affiliate/click?p=p1&r=r1');
    expect(opened).toEqual(['https://hugfab.test/api/affiliate/click?p=p1&r=r1']);
  });
});

describe('openWebPage', () => {
  it('prefixes a HugFab path', async () => {
    await openWebPage('/cart');
    expect(opened).toEqual(['https://hugfab.test/cart']);
  });
});

describe('openExternal', () => {
  it('opens somebody else absolute URL untouched', async () => {
    const tracking = 'https://www.delhivery.com/track/package/2849106633721';
    await openExternal(tracking);
    expect(opened).toEqual([tracking]);
  });

  it('does not prefix the HugFab base onto it', async () => {
    // The regression this file exists for.
    await openExternal('https://courier.example/track/1');
    expect(opened[0]).not.toContain('hugfab.test/https');
  });

  it('opens plain http as well as https', async () => {
    await openExternal('http://courier.example/track/1');
    expect(opened).toHaveLength(1);
  });

  it('refuses a javascript: URL', async () => {
    /*
     * A scheme that is not http(s) arriving in a field meant to hold a
     * courier's address is either a mistake upstream or an attempt at
     * something. Neither is worth handing to a browser.
     */
    await openExternal('javascript:alert(1)');
    expect(opened).toHaveLength(0);
  });

  it('refuses other schemes', async () => {
    for (const url of [
      'intent://scan/#Intent;end',
      'file:///etc/passwd',
      'data:text/html,x',
    ]) {
      await openExternal(url);
    }
    expect(opened).toHaveLength(0);
  });

  it('ignores a string that is not a URL rather than throwing mid-render', async () => {
    await openExternal('not a url');
    await openExternal('');
    expect(opened).toHaveLength(0);
  });
});
