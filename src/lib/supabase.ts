// The URL polyfill must be imported before supabase-js: its client builds URLs
// with `URL` and `URLSearchParams`, and React Native's are incomplete.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, features } from './env';

/**
 * Authentication, and nothing else.
 *
 * This is the only module in the app permitted to import supabase-js — the lint
 * enforces it (`eslint.config.js`). Data does not come from here: every read and
 * write goes through `src/api`, so the offer, price and cart rules stay in the
 * web app's services where they are already written and tested. See CLAUDE.md.
 *
 * What this module owns: the session. Sign in, sign up, sign out, and a valid
 * access token for `src/api/client.ts` to attach.
 *
 * Session storage is AsyncStorage, which is unencrypted app-private storage. That
 * is the same exposure as a browser's localStorage, which is where the web app's
 * session lives, so it is not a regression — but `expo-secure-store` is the
 * hardening step, and it is listed in docs/PLAN.md rather than done quietly here.
 */

export const supabase: SupabaseClient | null = features.auth
  ? createClient(env.supabaseUrl as string, env.supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        /**
         * There is no URL to detect a session in. This is a native app: leaving
         * it on makes supabase-js look for an OAuth fragment that never exists.
         */
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * supabase-js refreshes on a timer, and a timer in a backgrounded React Native
 * app is throttled or suspended. Without this, a session that expired while the
 * phone was in a pocket stays expired until something fails — so the app pauses
 * the refresh loop on background and resumes it on foreground, which is what
 * Supabase's own React Native guidance asks for.
 *
 * Called once from the root layout. Returns its own teardown.
 */
export function startSessionRefresh(): () => void {
  if (!supabase) return () => {};

  const client = supabase;

  const onChange = (state: AppStateStatus): void => {
    if (state === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  };

  // The listener only fires on a change, so settle the current state first.
  onChange(AppState.currentState);
  const subscription = AppState.addEventListener('change', onChange);

  return () => subscription.remove();
}

/**
 * A valid access token, or null when nobody is signed in.
 *
 * `getSession()` rather than `getUser()`: this runs before every authenticated
 * request and `getUser()` is a network round trip to the auth server. The token
 * is not trusted here — the API revalidates it, which is the only place that
 * verdict means anything. supabase-js refreshes an expiring token as part of
 * this call.
 */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Force a refresh, for the one retry `apiFetch` makes after a 401. Returns the
 * new token, or null when the refresh token is spent too — at which point the
 * person is signed out and has to sign in again.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
