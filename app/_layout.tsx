/**
 * The root layout: everything every screen needs, and nothing else.
 *
 * `global.css` must be imported here and only here — it is what NativeWind's
 * Metro transform turns into the stylesheet, and importing it twice in a tree is
 * how a class silently stops applying.
 */

import '@/../global.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/auth/session';
import { createQueryClient } from '@/query/client';
import { Splash, MIN_VISIBLE_MS } from '@/components/splash';
import { Onboarding } from '@/onboarding/onboarding';
import {
  markOnboardingSeen,
  readOnboardingState,
  type OnboardingState,
} from '@/onboarding/storage';
import { color } from '@/theme';

/**
 * Hold the splash until Poppins is ready.
 *
 * Without this the first frame paints in the system face and then reflows when
 * the font arrives — every heading jumps, which is the single most obvious tell
 * that an app is not finished. The splash is cheaper than the reflow.
 *
 * `catch` because preventing auto-hide can reject if the splash has already
 * gone, and a font-loading nicety must never be the thing that fails a launch.
 */
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout(): React.JSX.Element {
  // One client for the app's lifetime. Created in a memo rather than at module
  // scope so a Fast Refresh does not leave two clients holding two caches.
  const queryClient = useMemo(() => createQueryClient(), []);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  /**
   * The launch gate.
   *
   * Onboarding is not a route here, it is a state. Gating with `router.replace`
   * means the tab navigator mounts first and the intro slides in over it, which
   * both flickers and puts Home in the back stack — press back on slide one and
   * you are in an app you have not been introduced to. Rendering it instead of
   * the navigator has neither problem. `app/onboarding.tsx` still exists as a
   * route so it can be opened directly and tested.
   */
  const [onboarding, setOnboarding] = useState<OnboardingState>('loading');
  const [beatDone, setBeatDone] = useState(MIN_VISIBLE_MS === 0);

  useEffect(() => {
    void readOnboardingState().then(setOnboarding);
  }, []);

  useEffect(() => {
    if (MIN_VISIBLE_MS === 0) return;
    const timer = setTimeout(() => setBeatDone(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const finishOnboarding = useCallback(() => {
    // Written and forgotten: the screen changes on the state, not on the write,
    // so a storage failure costs a repeated intro rather than a stuck button.
    void markOnboardingSeen();
    setOnboarding('done');
  }, []);

  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    // Hand off from the native splash to ours as soon as we can draw the
    // wordmark in the right face. `fontError` counts: a missing font file is a
    // reason to look wrong, never a reason to show a splash screen for ever.
    if (fontsReady) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return <></>;

  if (onboarding === 'loading' || !beatDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Splash />
      </SafeAreaProvider>
    );
  }

  if (onboarding === 'needed') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Onboarding onDone={finishOnboarding} />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: color('surface') },
                headerTintColor: color('text'),
                headerTitleStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: color('background') },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="dashboard" options={{ title: 'Console' }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="search" options={{ headerShown: false }} />
              <Stack.Screen name="wishlist" options={{ title: 'My Wishlist' }} />
              <Stack.Screen name="cart" options={{ title: 'My Bag' }} />
              <Stack.Screen name="product/[slug]" options={{ title: '' }} />
              <Stack.Screen name="offers/[slug]" options={{ title: 'All offers' }} />
              <Stack.Screen
                name="account/orders/[orderId]"
                options={{ title: 'Order' }}
              />
              <Stack.Screen
                name="auth/login"
                options={{ title: 'Sign in', presentation: 'modal' }}
              />
              <Stack.Screen
                name="auth/signup"
                options={{ title: 'Create an account', presentation: 'modal' }}
              />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
