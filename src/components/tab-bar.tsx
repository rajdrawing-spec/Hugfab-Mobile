/**
 * The bottom bar: **Home · Discover · AI · Community · Account**, with AI raised.
 *
 * Five destinations, per the mobile brief §35, and they are all destinations —
 * which is why Search and the Bag are not here. Both are actions on whatever you
 * are looking at, and both live in `AppHeader` instead.
 *
 * AI is raised rather than Search. The web app's mobile bar lifts Search because
 * a website's header already carries the field and the bar is compensating for
 * losing it; here the header still has it. What the raised control should be is
 * whatever the product wants people to try, and the brief is unambiguous that
 * HugFab is *discovery + AI styling + price comparison* rather than a catalogue.
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
  discover: { on: 'compass', off: 'compass-outline' },
  community: { on: 'people', off: 'people-outline' },
  account: { on: 'person', off: 'person-outline' },
};

/** The raised control. Still a destination here, just the emphasised one. */
const ACTION_ROUTE = 'stylist';

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
            accessibilityRole="tab"
            accessibilityState={{
              selected: state.routes[state.index]?.name === ACTION_ROUTE,
            }}
            accessibilityLabel="AI Stylist"
            onPress={() => navigation.navigate(action.name)}
            style={{ ...elevation('md'), shadowColor: color('primary') }}
            className="bg-primary -mt-6 h-14 w-14 items-center justify-center rounded-full"
          >
            <Ionicons name="sparkles" size={23} color={color('primary-foreground')} />
          </Touchable>
          <Text
            step="caption"
            tone={state.routes[state.index]?.name === ACTION_ROUTE ? 'primary' : 'muted'}
            className="mt-0.5"
          >
            AI
          </Text>
        </View>
      ) : null}

      {right.map(renderTab)}
    </View>
  );
}
