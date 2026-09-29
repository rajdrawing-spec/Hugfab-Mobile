/**
 * The tab navigator. Its bar is `src/components/tab-bar.tsx` — four destinations
 * around a raised Search button, per `docs/ui-ux-guide.md` §3.
 *
 * Route order here is the order they sit in the bar, and `search` is placed in
 * the middle so the custom bar can lift it out: the bar filters it from the
 * destinations and draws it as the action.
 *
 * The Bag is labelled "Bag" and routed at `cart` — the word is the web app's, the
 * route matches the API.
 */

import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';
import { color } from '@/theme';

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: color('surface') },
        headerTintColor: color('text'),
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
        sceneStyle: { backgroundColor: color('background') },
      }}
    >
      <Tabs.Screen name="index" options={{ headerShown: false, tabBarLabel: 'Home' }} />
      <Tabs.Screen
        name="wishlist"
        options={{ title: 'Wishlist', tabBarLabel: 'Wishlist' }}
      />
      <Tabs.Screen
        name="search"
        options={{ headerShown: false, tabBarLabel: 'Search' }}
      />
      <Tabs.Screen name="cart" options={{ title: 'Bag', tabBarLabel: 'Bag' }} />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarLabel: 'Account' }}
      />
    </Tabs>
  );
}
