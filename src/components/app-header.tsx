/**
 * The header the brief puts on every surface: wordmark left, then search,
 * notifications and cart on the right.
 *
 * Cart lives here rather than in the bottom bar because the bottom bar's five
 * places are destinations — Home, Discover, AI, Community, Account — and the bag
 * is an action on whatever you are looking at. That is the brief's structure and
 * it is also why the web app models its raised control separately.
 *
 * The cart badge is a real count from `GET /api/cart`, which does not exist yet
 * (`docs/API-GAPS.md` §3). Until it does the badge is simply absent — never a
 * zero, and never a dot standing in for a number nobody has.
 */

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from './text';
import { Touchable } from './pressable';
import { getCart } from '@/api/cart';
import { openWebPage } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';
import { color } from '@/theme';

export function AppHeader({
  title,
  showWordmark = false,
}: {
  title?: string;
  showWordmark?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { status } = useAuth();

  const cart = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: ({ signal }) => getCart(signal),
    enabled: status === 'signedIn',
    // The bag is not this header's job to report on. A failure leaves the badge
    // off; the Bag screen says what happened properly.
    retry: false,
  });

  const count = cart.data?.itemCount ?? 0;

  return (
    <View className="bg-surface flex-row items-center px-4 py-2">
      {showWordmark ? (
        <Text step="h3" weight="bold" className="flex-1">
          HugFab
        </Text>
      ) : (
        <Text step="h3" numberOfLines={1} className="flex-1">
          {title ?? ''}
        </Text>
      )}

      <HeaderIcon
        name="search-outline"
        label="Search"
        onPress={() => router.push('/search')}
      />
      {/* The brief puts notifications among the global actions. There is no feed
          endpoint — `account/summary` returns a count and nothing to show — so
          the bell opens the web list rather than a screen this app cannot fill.
          `docs/API-GAPS.md` records what it would need. */}
      <HeaderIcon
        name="notifications-outline"
        label="Notifications"
        onPress={() => void openWebPage('/account/notifications')}
      />
      <HeaderIcon
        name="bag-outline"
        label={count > 0 ? `Bag, ${String(count)} items` : 'Bag'}
        badge={count > 0 ? count : null}
        onPress={() => router.push('/cart')}
      />
    </View>
  );
}

function HeaderIcon({
  name,
  label,
  badge,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number | null;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="ml-1 p-2"
    >
      <View>
        <Ionicons name={name} size={22} color={color('text')} />
        {badge ? (
          <View className="bg-primary absolute -right-1.5 -top-1 h-4 min-w-4 items-center justify-center rounded-full px-1">
            <Text step="caption" tone="primary-foreground" weight="semibold">
              {badge > 9 ? '9+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
}
