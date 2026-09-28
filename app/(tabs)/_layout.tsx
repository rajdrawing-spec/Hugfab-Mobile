/**
 * The bottom bar: five destinations.
 *
 * The web app's mobile bar is four destinations around a raised Search button
 * (`MOBILE_ACTION` in its `nav-links.ts`), because a website's header already
 * carries a search field and the bar is compensating for losing it. A native app
 * has the tab bar as its only chrome, so Search is a destination here and the Bag
 * — which the web keeps in its header — becomes one too.
 *
 * The Bag is labelled "Bag" and routed at `cart`: the word is the web app's, the
 * route matches the API.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { color } from '@/theme';

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color('primary'),
        tabBarInactiveTintColor: color('muted'),
        tabBarStyle: {
          backgroundColor: color('surface'),
          borderTopColor: color('border'),
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: color('surface') },
        headerTintColor: color('text'),
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: color('background') },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HugFab',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color: tint, size }) => (
            <Ionicons name="home-outline" color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color: tint, size }) => (
            <Ionicons name="search-outline" color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color: tint, size }) => (
            <Ionicons name="heart-outline" color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Bag',
          tabBarIcon: ({ color: tint, size }) => (
            <Ionicons name="bag-outline" color={tint} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color: tint, size }) => (
            <Ionicons name="person-outline" color={tint} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
