/**
 * Whether this person has seen the intro.
 *
 * AsyncStorage, not the server: it is a per-install preference, it must be
 * readable before anyone signs in, and the brief is explicit that nobody is made
 * to create an account before exploring. A server-side flag would need a session
 * to read, which is exactly the thing we are not asking for yet.
 *
 * Every read is wrapped: storage can throw on a device with it disabled, and a
 * failure to remember must degrade to "show the intro" rather than to a crash on
 * launch. Showing it twice is a small annoyance; failing to start is not.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Versioned. If the intro is ever rewritten enough to be worth showing again,
 * bump the suffix rather than clearing the old key — an install that downgrades
 * then still knows what it saw.
 */
const KEY = 'hugfab.onboarding.seen.v1';

export type OnboardingState = 'loading' | 'needed' | 'done';

export async function readOnboardingState(): Promise<'needed' | 'done'> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true' ? 'done' : 'needed';
  } catch {
    return 'needed';
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // The intro will show again next launch. That is the whole cost.
  }
}

/** For a "show me the intro again" control, and for testing on a device. */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to do; the flag stays set.
  }
}
