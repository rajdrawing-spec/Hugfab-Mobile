/**
 * The configuration layer: committed defaults, environment overrides.
 *
 * This does not check that the values *work* — that the Supabase project
 * answers, or that the API is up. Nothing in this suite can: see
 * `vitest.config.ts` and `docs/PRODUCTION-READINESS.md`. What it pins is the
 * precedence, because that is what breaks silently. An override that is ignored
 * points a tester's build at production; a default that is ignored leaves the
 * app unconfigured in a fresh clone, which is the state this change ended.
 *
 * `env` is computed once at module load, so every case resets the module
 * registry and imports it again.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicConfig } from './public-config';

const VARS = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

async function loadEnv() {
  vi.resetModules();
  return import('./env');
}

/** The payload of a Supabase key in its legacy JWT form. */
function claims(key: string): { ref?: string; role?: string } {
  const payload = key.split('.')[1] as string;
  return JSON.parse(Buffer.from(payload, 'base64').toString()) as {
    ref?: string;
    role?: string;
  };
}

beforeEach(() => {
  // Expo injects these from `.env*`; a developer's shell may have them too.
  for (const name of VARS) vi.stubEnv(name, '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('with nothing in the environment', () => {
  it('uses the committed HugFab backend', async () => {
    const { env } = await loadEnv();

    expect(env.apiBaseUrl).toBe(publicConfig.apiBaseUrl);
    expect(env.supabaseUrl).toBe(publicConfig.supabaseUrl);
    expect(env.supabaseAnonKey).toBe(publicConfig.supabaseAnonKey);
  });

  it('reports both features as configured', async () => {
    const { features, missingConfigMessage } = await loadEnv();

    expect(features.api).toBe(true);
    expect(features.auth).toBe(true);
    expect(missingConfigMessage()).toBeNull();
  });
});

describe('the committed Supabase config', () => {
  /**
   * The project ref appears in the URL and in the key's payload. A mismatched
   * pair fails at sign-in with "Invalid API key", which reads to a shopper like
   * a wrong password.
   */
  it('names one project in both the URL and the key', async () => {
    const { env } = await loadEnv();

    const ref = new URL(env.supabaseUrl as string).hostname.split('.')[0];

    expect(claims(env.supabaseAnonKey as string).ref).toBe(ref);
  });

  /**
   * The one mistake this config must never make. A service-role key carries
   * `"role":"service_role"` and bypasses RLS, so in a bundle anyone can unzip
   * it is every row of every table.
   */
  it('carries the anon role, never the service role', async () => {
    const { env } = await loadEnv();

    expect(claims(env.supabaseAnonKey as string).role).toBe('anon');
  });
});

describe('an environment override', () => {
  it('wins over the committed default', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'http://192.168.1.8:3000');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example-staging.supabase.co');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'staging-key');

    const { env } = await loadEnv();

    expect(env.apiBaseUrl).toBe('http://192.168.1.8:3000');
    expect(env.supabaseUrl).toBe('https://example-staging.supabase.co');
    expect(env.supabaseAnonKey).toBe('staging-key');
  });

  it('loses its trailing slash, so no URL is built with two', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'https://staging.hugfab.com///');

    const { env } = await loadEnv();

    expect(env.apiBaseUrl).toBe('https://staging.hugfab.com');
  });

  it('is ignored when it is blank or whitespace', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', '   ');

    const { env } = await loadEnv();

    expect(env.apiBaseUrl).toBe(publicConfig.apiBaseUrl);
  });
});
