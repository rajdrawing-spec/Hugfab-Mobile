/**
 * A sideways-scrolling row of products, with its own loading, empty and error
 * states — a rail is an independent query, so one failing must not take the home
 * screen down with it.
 *
 * A rail that comes back empty renders nothing at all. An empty state per rail
 * would give a shopper four apologies on one screen for a catalogue gap that is
 * not their problem.
 */

import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Text } from './text';
import { ProductCard } from './product-card';
import { Skeleton } from './states';
import { describeError } from '@/api/errors';
import { listProducts, type ProductFilters } from '@/api/products';
import { queryKeys } from '@/query/keys';
import type { ProductSummary } from '@/api/types';

const CARD_WIDTH = 160;

export function ProductRail({
  title,
  subtitle,
  filters,
  seeAll,
}: {
  title: string;
  subtitle?: string;
  filters: ProductFilters;
  seeAll?: ProductFilters;
}): React.JSX.Element | null {
  const query = useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: ({ signal }) => listProducts(filters, signal),
  });

  if (query.isError) {
    return (
      <View className="px-4 py-5">
        <RailHeading title={title} subtitle={subtitle} />
        <Text step="small" tone="muted" className="mt-2">
          {describeError(query.error).message}
        </Text>
      </View>
    );
  }

  if (query.isPending) {
    return (
      <View className="py-5">
        <View className="px-4">
          <RailHeading title={title} subtitle={subtitle} />
        </View>
        <View className="mt-2 flex-row px-2">
          {[0, 1, 2].map((index) => (
            <View key={index} style={{ width: CARD_WIDTH }} className="p-2">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-4 w-1/2" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const items = query.data.items;
  if (items.length === 0) return null;

  return (
    <View className="py-5">
      <View className="flex-row items-end justify-between px-4">
        <RailHeading title={title} subtitle={subtitle} />
        {seeAll ? (
          <Link
            href={{ pathname: '/search', params: toSearchParams(seeAll) }}
            className="pl-3"
          >
            <Text step="small" tone="primary" weight="semibold">
              See all
            </Text>
          </Link>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item: ProductSummary) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-2 pt-2"
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}

function RailHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  return (
    <View className="flex-1">
      <Text step="h3">{title}</Text>
      {subtitle ? (
        <Text step="caption" tone="muted" className="mt-0.5">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Router params are strings. Arrays are comma-joined, which is the same encoding
 * `/api/products` documents for `brand` and `retailer`, so the search screen can
 * hand them straight back to the API.
 */
function toSearchParams(filters: ProductFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    params[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return params;
}
