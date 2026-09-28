/**
 * Account: who you are, your recent orders, and the way out.
 *
 * `GET /api/account/summary` answers 200 with `data: null` for a visitor rather
 * than 401 — "nobody is signed in" is an answer, not an error — so this screen can
 * ask it without knowing first.
 *
 * Addresses are not here. The endpoints are `docs/API-GAPS.md` §4 and an address
 * form that cannot save is worse than a link to one that can.
 */

import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { OrderRow } from '@/components/order-row';
import { getAccountSummary, listOrders } from '@/api/account';
import { describeError } from '@/api/errors';
import { openWebPage } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';

export default function AccountScreen(): React.JSX.Element {
  const { status, user, available, signOut } = useAuth();
  const router = useRouter();

  const summary = useQuery({
    queryKey: queryKeys.accountSummary(),
    queryFn: ({ signal }) => getAccountSummary(signal),
    enabled: status === 'signedIn',
  });

  const orders = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: ({ signal }) => listOrders(signal),
    enabled: status === 'signedIn',
  });

  if (!available) {
    return (
      <ErrorState
        error={
          new Error(
            'Signing in is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.',
          )
        }
      />
    );
  }

  if (status === 'loading') {
    return (
      <View className="flex-1 bg-background p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-3 h-4 w-2/3" />
      </View>
    );
  }

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in to HugFab"
        body="Your wishlist, bag and orders are kept with your account, on the app and on the website."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  const name = summary.data?.firstName ?? null;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <View className="bg-surface p-4">
        <Text step="h2">{name ? `Hello, ${name}` : 'Your account'}</Text>
        {user?.email ? (
          <Text step="small" tone="muted" className="mt-1">
            {user.email}
          </Text>
        ) : null}

        {/* Both counts are docs/API-GAPS.md §6 and absent until it ships. Rendered
            only when present rather than defaulted to 0, because a wrong zero
            beside "orders" is a worse answer than no line at all. */}
        {typeof summary.data?.orderCount === 'number' ||
        typeof summary.data?.wishlistCount === 'number' ? (
          <View className="mt-3 flex-row gap-6">
            {typeof summary.data.orderCount === 'number' ? (
              <Stat label="Orders" value={summary.data.orderCount} />
            ) : null}
            {typeof summary.data.wishlistCount === 'number' ? (
              <Stat label="Saved" value={summary.data.wishlistCount} />
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="bg-surface mt-3 p-4">
        <Text step="h3">Recent orders</Text>

        {orders.isPending ? (
          <View className="mt-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="mt-3 h-20 w-full rounded-lg" />
          </View>
        ) : orders.isError ? (
          <View className="mt-3">
            <Text step="small" tone="muted">
              {describeError(orders.error).message}
            </Text>
            <Button
              label="Open orders on the website"
              variant="outline"
              size="sm"
              pill
              className="mt-3 self-start"
              onPress={() => void openWebPage('/account/orders')}
            />
          </View>
        ) : orders.data.orders.length === 0 ? (
          <Text step="small" tone="muted" className="mt-2">
            You have not placed an order yet.
          </Text>
        ) : (
          <View className="mt-3">
            {orders.data.orders.slice(0, 5).map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onPress={() =>
                  router.push({
                    pathname: '/account/orders/[orderId]',
                    params: { orderId: order.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      <View className="bg-surface mt-3 p-4">
        <Text step="h3">On the website</Text>
        <Text step="small" tone="muted" className="mt-1">
          These are not in the app yet. See docs/API-GAPS.md for what each one needs.
        </Text>
        <Button
          label="Addresses"
          variant="text"
          className="mt-2 self-start"
          onPress={() => void openWebPage('/account/addresses')}
        />
        <Button
          label="Returns"
          variant="text"
          className="self-start"
          onPress={() => void openWebPage('/account/returns')}
        />
        <Button
          label="Notifications"
          variant="text"
          className="self-start"
          onPress={() => void openWebPage('/account/notifications')}
        />
      </View>

      <View className="p-4">
        <Button
          label="Sign out"
          variant="outline"
          pill
          fullWidth
          onPress={() => void signOut()}
        />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <View>
      <Text step="h3">{String(value)}</Text>
      <Text step="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}
