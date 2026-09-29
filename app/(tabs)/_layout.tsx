/**
 * The tab navigator: Home · Discover · AI · Community · Account, per the mobile
 * brief §35, with AI raised by `src/components/tab-bar.tsx`.
 *
 * Route order here is the order they sit in the bar, and `stylist` is placed in
 * the middle so the custom bar can lift it out.
 *
 * Search, the Bag and Wishlist are **not** tabs. Search and the Bag are global
 * actions in `AppHeader`; Wishlist is reached from Account, which is where the
 * brief puts it. All three are still routes — they are simply not destinations
 * in the bar.
 *
 * Every tab hides the navigator's own header and draws `AppHeader` instead, so
 * the wordmark, search, bell and bag are identical on every surface.
 */

import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';
import { color } from '@/theme';

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color('background') },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Home' }} />
      <Tabs.Screen name="discover" options={{ tabBarLabel: 'Discover' }} />
      <Tabs.Screen name="stylist" options={{ tabBarLabel: 'AI' }} />
      <Tabs.Screen name="community" options={{ tabBarLabel: 'Community' }} />
      <Tabs.Screen name="account" options={{ tabBarLabel: 'Account' }} />
    </Tabs>
  );
}
