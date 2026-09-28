/**
 * The root layout: everything every screen needs, and nothing else.
 *
 * `global.css` must be imported here and only here — it is what NativeWind's
 * Metro transform turns into the stylesheet, and importing it twice in a tree is
 * how a class silently stops applying.
 */

import '@/../global.css';

import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/auth/session';
import { createQueryClient } from '@/query/client';
import { color } from '@/theme';

export default function RootLayout(): React.JSX.Element {
  // One client for the app's lifetime. Created in a memo rather than at module
  // scope so a Fast Refresh does not leave two clients holding two caches.
  const queryClient = useMemo(() => createQueryClient(), []);

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
                headerTitleStyle: { fontSize: 17, fontWeight: '600' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: color('background') },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
