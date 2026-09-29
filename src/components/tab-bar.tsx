/**
 * The bottom bar: **four destinations around a raised action button**, which is
 * what `docs/ui-ux-guide.md` §3 specifies and what the web app models separately
 * as `MOBILE_ACTION` — the raised control is not a destination, so it is not a
 * tab, and the first version of this app got that wrong by making Search the
 * fifth of five equal tabs.
 *
 * The destinations differ from the web app's mobile bar (Home · Discover ·
 * Community · Account) because Discover and Community are not in Phase 1. The
 * shape is the guide's; the contents are what this app actually has.
 *
 * The raised button is Search, per §1: *search is the front door*. Home also
 * carries a full-width search bar, which is the same principle stated twice on
 * purpose — the bar is for browsing into, the button is for reaching from
 * anywhere.
 */

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Text } from './text';
import { Touchable } from './pressable';
import { color, elevation } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Filled when active, outline when not — the cheapest legible state change. */
const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'home', off: 'home-outline' },
  wishlist: { on: 'heart', off: 'heart-outline' },
  cart: { on: 'bag', off: 'bag-outline' },
  account: { on: 'person', off: 'person-outline' },
};

/** The raised control, which is not a destination and so is not in this list. */
const ACTION_ROUTE = 'search';

export function TabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => route.name !== ACTION_ROUTE);
  const action = state.routes.find((route) => route.name === ACTION_ROUTE);

  // Two destinations, the raised button, then two more.
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]): React.JSX.Element => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const label = descriptors[route.key]?.options.tabBarLabel;
    const icon = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };

    return (
      <Touchable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={typeof label === 'string' ? label : route.name}
        press="none"
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        containerClassName="flex-1"
        className="items-center px-1 py-2"
      >
        <Ionicons
          name={focused ? icon.on : icon.off}
          size={22}
          color={focused ? color('primary') : color('muted')}
        />
        <Text
          step="caption"
          numberOfLines={1}
          tone={focused ? 'primary' : 'muted'}
          className="mt-0.5"
        >
          {typeof label === 'string' ? label : route.name}
        </Text>
      </Touchable>
    );
  };

  return (
    <View
      className="bg-surface flex-row items-start border-t border-border px-2 pt-1"
      style={{ paddingBottom: insets.bottom + 4, ...elevation('lg') }}
    >
      {left.map(renderTab)}

      {action ? (
        <View className="w-20 items-center">
          {/* Lifted above the bar's own top edge, which is what makes it read as
              an action rather than a fifth tab. */}
          <Touchable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={() => navigation.navigate(action.name)}
            style={{ ...elevation('md'), shadowColor: color('primary') }}
            className="bg-primary -mt-6 h-14 w-14 items-center justify-center rounded-full"
          >
            <Ionicons name="search" size={24} color={color('primary-foreground')} />
          </Touchable>
          <Text step="caption" tone="muted" className="mt-0.5">
            Search
          </Text>
        </View>
      ) : null}

      {right.map(renderTab)}
    </View>
  );
}
