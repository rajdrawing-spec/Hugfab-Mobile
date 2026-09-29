/**
 * Saved products.
 *
 * Signed out is not an error and not an empty list — it is a third state with its
 * own answer, which is why `SignInPrompt` exists. Showing "nothing saved yet" to
 * someone with twelve saved products because they are not signed in would be a lie
 * the app told itself first.
 *
 * `GET /api/wishlist` is `docs/API-GAPS.md` §2 and answers 404 today, which becomes
 * "not in the app yet" with a link to the website rather than "Not found."
 *
 * The brief's three tabs — All, Price drops, Available — are what makes a wishlist
 * a price-tracking tool rather than a list of bookmarks. Two of them work on what
 * `WishlistItem` already carries: `inStock` filters Available, and `target` (the
 * price alert) is a real field. **Price drops does not.** The item has no previous
 * price, so "dropped ₹150" cannot be computed or shown; that tab filters to items
 * with an alert set and says so. §2 of the gaps doc now asks for `previousPrice`,
 * which the database already keeps — the grid's `priceDrop` field proves it.
 */

import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Chip } from '@/components/chip';
import { Price } from '@/components/price';
import { Badge } from '@/components/badge';
import { EmptyState, ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { listWishlist, removeFromWishlist } from '@/api/account';
import { queryKeys } from '@/query/keys';
import { elevation } from '@/theme';
import { useAuth } from '@/auth/session';
import type { WishlistItem } from '@/api/types';

export default function WishlistScreen(): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'all' | 'alerts' | 'available'>('all');

  const query = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: ({ signal }) => listWishlist(signal),
    enabled: status === 'signedIn',
  });

  const items = useMemo(() => {
    const all = query.data?.items ?? [];
    if (tab === 'available') return all.filter((item) => item.inStock);
    if (tab === 'alerts') return all.filter((item) => item.target !== null);
    return all;
  }, [query.data, tab]);

  const remove = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() }),
  });

  if (status === 'loading') {
    return <ListSkeleton />;
  }

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in to see your wishlist"
        body="Products you save are kept with your account, so they follow you to the website and back."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  if (query.isPending) return <ListSkeleton />;

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  if (query.data.items.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Save products you love and find them here — with their prices watched."
        actionLabel="Discover fashion"
        onAction={() => router.push('/discover')}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      data={items}
      ListHeaderComponent={
        <View className="flex-row flex-wrap pb-1">
          <Chip label="All" selected={tab === 'all'} onPress={() => setTab('all')} />
          <Chip
            label="Price alerts"
            selected={tab === 'alerts'}
            onPress={() => setTab('alerts')}
          />
          <Chip
            label="Available"
            selected={tab === 'available'}
            onPress={() => setTab('available')}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="Nothing in this tab"
          body={
            tab === 'available'
              ? 'None of your saved products is in stock right now.'
              : 'You have not set a price alert on any saved product yet.'
          }
          actionLabel="Show all saved"
          onAction={() => setTab('all')}
        />
      }
      keyExtractor={(item) => item.id}
      contentContainerClassName="p-4"
      renderItem={({ item }) => (
        <WishlistRow
          item={item}
          removing={remove.isPending && remove.variables === item.productId}
          onRemove={() => remove.mutate(item.productId)}
          onOpen={() =>
            router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })
          }
        />
      )}
    />
  );
}

function WishlistRow({
  item,
  removing,
  onRemove,
  onOpen,
}: {
  item: WishlistItem;
  removing: boolean;
  onRemove: () => void;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <View
      style={elevation('sm')}
      className={`bg-surface mb-3 flex-row rounded-lg p-3 ${removing ? 'opacity-50' : ''}`}
    >
      <Pressable accessibilityRole="link" onPress={onOpen}>
        <Image
          source={item.imageUrl}
          contentFit="cover"
          transition={150}
          className="bg-surface-2 h-24 w-20 rounded-md"
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <View className="flex-1 pl-3">
        <Pressable accessibilityRole="link" onPress={onOpen}>
          <Text step="small" numberOfLines={2}>
            {item.title}
          </Text>
        </Pressable>

        <View className="mt-1.5">
          {item.price ? (
            <Price price={item.price} />
          ) : (
            <Text step="small" tone="muted">
              No price right now
            </Text>
          )}
        </View>

        <View className="mt-1.5 flex-row items-center gap-2">
          {item.inStock ? (
            <Badge label="In stock" tone="success" />
          ) : (
            <Badge label="Out of stock" tone="muted" />
          )}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.title} from your wishlist`}
        disabled={removing}
        onPress={onRemove}
        className="self-start p-1"
      >
        <Text step="small" tone="muted">
          Remove
        </Text>
      </Pressable>
    </View>
  );
}

function ListSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background p-4" accessibilityLabel="Loading your wishlist">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="mb-3 h-28 w-full rounded-lg" />
      ))}
    </View>
  );
}
