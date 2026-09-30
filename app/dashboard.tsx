/**
 * The console, for a seller or an admin.
 *
 * `docs/PLAN.md` excluded the merchant and admin surfaces from mobile, and still
 * does — approving a settlement or resolving a return is desk work. This screen
 * is not those surfaces. It answers one question a phone is the right device for:
 * **is anything waiting on me?** Everything it lists opens the web console, where
 * the work actually happens.
 *
 * Which console you see is the server's decision, not this app's. Both endpoints
 * answer `NOT_FOUND` for someone who is not a seller or not an admin — so the
 * screen asks both and renders whatever comes back. A person who is both gets
 * both; a shopper who reaches this route by its URL is told plainly there is
 * nothing here for them, which is also true.
 */

import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { StatRow, StatTile } from '@/components/stat-tile';
import { AllClear, AlertCard, AttentionItemCard } from '@/components/attention-card';
import { EmptyState, ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { getAdminAttention, getMerchantAttention } from '@/api/dashboard';
import { openWebPage } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';
import { color } from '@/theme';

/**
 * A count is stale the moment it is drawn, and both routes are `no-store` for
 * that reason — the web console polls them while it is open. A minute is the
 * compromise: fresh enough that a new order is not hidden behind a cache, slow
 * enough that leaving the screen open on a train does not spend the seller's
 * rate-limit budget. Pull-to-refresh is there for when a minute is too long.
 */
const REFETCH_MS = 60_000;

export default function DashboardScreen(): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [merchant, admin] = useQueries({
    queries: [
      {
        queryKey: queryKeys.merchantAttention(),
        queryFn: ({ signal }: { signal: AbortSignal }) => getMerchantAttention(signal),
        enabled: status === 'signedIn',
        refetchInterval: REFETCH_MS,
        staleTime: 0,
      },
      {
        queryKey: queryKeys.adminAttention(),
        queryFn: ({ signal }: { signal: AbortSignal }) => getAdminAttention(signal),
        enabled: status === 'signedIn',
        refetchInterval: REFETCH_MS,
        staleTime: 0,
      },
    ],
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient
      .invalidateQueries({ queryKey: ['console'] })
      .finally(() => setRefreshing(false));
  }, [queryClient]);

  if (status === 'loading') return <DashboardSkeleton />;

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in to see your console"
        body="Sellers and admins see what is waiting on them here."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  if (merchant.isPending || admin.isPending) return <DashboardSkeleton />;

  /**
   * Only a real failure reaches here — "you are not a seller" resolved to null in
   * `src/api/dashboard.ts`. So if either query errored, say so rather than
   * showing a half dashboard that looks complete.
   */
  const failure = merchant.error ?? admin.error;
  if (failure) {
    return (
      <ErrorState
        error={failure}
        onRetry={() => {
          void merchant.refetch();
          void admin.refetch();
        }}
      />
    );
  }

  const seller = merchant.data;
  const console_ = admin.data;

  if (!seller && !console_) {
    return (
      <EmptyState
        title="Nothing here for this account"
        body="This is the seller and admin console. Your account does not have one — if you think it should, check which account you are signed in as."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Console' }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color('primary')}
          />
        }
      >
        {seller ? (
          <View className="mb-6">
            <Text step="h3">Your shop</Text>

            {seller.alerts.length > 0 ? (
              <View className="mt-3">
                {seller.alerts.map((alert) => (
                  <AlertCard key={alert.key} alert={alert} />
                ))}
              </View>
            ) : (
              <View className="mt-3">
                <AllClear message="Nothing is waiting on you right now." />
              </View>
            )}

            <View className="mt-1">
              <StatRow>
                <StatTile value={seller.newOrders} label="New orders" emphasis />
                <StatTile value={seller.toPack} label="To pack" emphasis />
              </StatRow>
              <StatRow>
                <StatTile value={seller.toShip} label="To ship" emphasis />
                <StatTile value={seller.openReturns} label="Open returns" emphasis />
              </StatRow>
              <StatRow>
                <StatTile value={seller.outOfStock} label="Out of stock" />
                <StatTile value={seller.lowStock} label="Low stock" />
              </StatRow>
              <StatRow>
                <StatTile value={seller.listings} label="Listings" />
                <StatTile value={seller.untracked} label="Stock untracked" />
              </StatRow>
            </View>

            {seller.latestOrder ? (
              <Button
                label={`Open order ${seller.latestOrder.number}`}
                variant="outline"
                pill
                fullWidth
                className="mt-1"
                onPress={() =>
                  void openWebPage(`/merchant/orders/${seller.latestOrder?.id ?? ''}`)
                }
              />
            ) : null}

            {/* A zero above can mean "none" or "not yours to see" — the endpoint
                zeroes what this person's role cannot read. Saying so beats a
                seller concluding their orders vanished. */}
            <Text step="caption" tone="muted" className="mt-3">
              Counts cover what your role can see. Everything here opens the seller
              console on the website.
            </Text>
          </View>
        ) : null}

        {console_ ? (
          <View>
            <Text step="h3">Platform</Text>
            <Text step="caption" tone="muted" className="mt-1">
              {console_.needsAction === 0
                ? 'No queue needs a person.'
                : `${String(console_.needsAction)} ${
                    console_.needsAction === 1 ? 'queue needs' : 'queues need'
                  } a person.`}
            </Text>

            <View className="mt-3">
              {console_.items.length === 0 ? (
                <AllClear message="Every queue is clear." />
              ) : (
                console_.items.map((item) => (
                  <AttentionItemCard key={item.id} item={item} />
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function DashboardSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background p-4" accessibilityLabel="Loading your console">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="mt-3 h-20 w-full rounded-lg" />
      <View className="mt-3 flex-row gap-3">
        <Skeleton className="h-20 flex-1 rounded-lg" />
        <Skeleton className="h-20 flex-1 rounded-lg" />
      </View>
      <View className="mt-3 flex-row gap-3">
        <Skeleton className="h-20 flex-1 rounded-lg" />
        <Skeleton className="h-20 flex-1 rounded-lg" />
      </View>
    </View>
  );
}
