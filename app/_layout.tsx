/**
 * The root layout: everything every screen needs, and nothing else.
 *
 * `global.css` must be imported here and only here — it is what NativeWind's
 * Metro transform turns into the stylesheet, and importing it twice in a tree is
 * how a class silently stops applying.
 */

import '@/../global.css';

import { useEffect, useMemo } from 'react';
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

  useEffect(() => {
    // `fontError` hides the splash too: a missing font file is a reason to look
    // wrong, never a reason to show a splash screen for ever.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <></>;

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
