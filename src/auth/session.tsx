/**
 * Who is signed in, for the whole app.
 *
 * One subscription to Supabase's `onAuthStateChange` rather than a `getSession()`
 * in every screen: a screen that asks independently will show a signed-out state
 * for a frame after a cold start, and five screens asking is five different
 * answers during a token refresh.
 *
 * `status` is three-valued on purpose. "Loading" is not "signed out" — treating
 * them as one is what makes an app flash its sign-in screen at someone who is
 * already signed in, every single launch.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { startSessionRefresh, supabase } from '@/lib/supabase';
import { signOutThisDevice } from './sign-out';
import { features } from '@/lib/env';

export interface SessionUser {
  id: string;
  email: string | null;
}

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export interface AuthState {
  status: SessionStatus;
  user: SessionUser | null;
  /** False when Supabase is not configured: sign-in cannot be offered at all. */
  available: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export interface SignUpResult {
  /**
   * Supabase returns a user with no session when email confirmation is on. The
   * screen has to say "check your email" rather than navigating to a signed-in
   * app that is not signed in.
   */
  needsEmailConfirmation: boolean;
}

/**
 * Supabase's auth errors are already written for people ("Invalid login
 * credentials"), but two of them are worth saying better, and one leaks a
 * distinction we should not make.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<SessionStatus>(
    features.auth ? 'loading' : 'signedOut',
  );
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    let active = true;

    // The stored session first, so a cold start does not flash signed-out.
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      setUser(
        session ? { id: session.user.id, email: session.user.email ?? null } : null,
      );
      setStatus(session ? 'signedIn' : 'signedOut');
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setUser(
        session ? { id: session.user.id, email: session.user.email ?? null } : null,
      );
      setStatus(session ? 'signedIn' : 'signedOut');
    });

    const stopRefresh = startSessionRefresh();

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      stopRefresh();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      available: features.auth,
      async signIn(email, password) {
        if (!supabase) throw new AuthError(NOT_CONFIGURED);
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new AuthError(error.message);
      },
      async signUp(email, password) {
        if (!supabase) throw new AuthError(NOT_CONFIGURED);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw new AuthError(error.message);
        return { needsEmailConfirmation: data.session === null };
      },
      async signOut() {
        if (!supabase) return;
        await signOutThisDevice(supabase.auth);
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const NOT_CONFIGURED =
  'Signing in is not available: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set.';

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
