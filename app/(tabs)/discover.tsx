/**
 * Discover — the brief's visual browsing surface: trending, new in, best deals,
 * price drops, under a price, brands.
 *
 * Every collection here is a real query against the documented `/api/products`
 * parameters. Three of the brief's sections are deliberately absent rather than
 * approximated, because each would be a claim this app cannot support:
 *
 * - **Trending** is click-outs by distinct shoppers in the web app's own
 *   merchandising rules, and `/api/products` has no such sort. "Newest" wearing
 *   a "Trending" label is the kind of quiet fiction PRD §69 exists to stop.
 * - **Price drops** need the price history the database keeps. `ProductSummary`
 *   carries `priceDrop`, but nothing filters a listing by it.
 * - **Best deals** come from Cuelinks, which `hugfab-api-readiness.md` records
 *   as NOT CONFIGURED, so the rail would be empty in production.
 *
 * All three are in `docs/API-GAPS.md`. They arrive as sections the moment a
 * `GET /api/homepage` or a sort can answer them.
 */

import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { AppHeader } from '@/components/app-header';
import { ProductRail } from '@/components/product-rail';
import { CategoryRail } from '@/components/category-rail';
import { AffiliateNote } from '@/components/affiliate-note';
import { ErrorState } from '@/components/states';
import { features, missingConfigMessage } from '@/lib/env';
import { formatMoney, toMajorUnits, type Money } from '@/lib/money';
import { color } from '@/theme';
import type { ProductFilters } from '@/api/products';

const under = (minor: number): Money => ({ amountMinor: minor, currency: 'INR' });

interface Collection {
  id: string;
  title: string;
  subtitle?: string;
  filters: ProductFilters;
  seeAll: ProductFilters;
}

const COLLECTIONS: readonly Collection[] = [
  {
    id: 'new-in',
    title: 'New in',
    subtitle: 'The most recent listings',
    filters: { sort: 'newest', perPage: 10, inStock: true },
    seeAll: { sort: 'newest', inStock: true },
  },
  {
    id: 'under-499',
    title: `Under ${formatMoney(under(49_900))}`,
    filters: {
      maxPrice: toMajorUnits(under(49_900)),
      sort: 'price_asc',
      perPage: 10,
      inStock: true,
    },
    seeAll: { maxPrice: toMajorUnits(under(49_900)), sort: 'price_asc', inStock: true },
  },
  {
    id: 'under-999',
    title: `Under ${formatMoney(under(99_900))}`,
    filters: {
      maxPrice: toMajorUnits(under(99_900)),
      sort: 'price_asc',
      perPage: 10,
      inStock: true,
    },
    seeAll: { maxPrice: toMajorUnits(under(99_900)), sort: 'price_asc', inStock: true },
  },
  {
    id: 'women',
    title: 'For women',
    filters: { gender: 'women', sort: 'newest', perPage: 10, inStock: true },
    seeAll: { gender: 'women', inStock: true },
  },
  {
    id: 'men',
    title: 'For men',
    filters: { gender: 'men', sort: 'newest', perPage: 10, inStock: true },
    seeAll: { gender: 'men', inStock: true },
  },
  {
    id: 'premium',
    title: 'The considered buy',
    subtitle: 'Higher-priced pieces, most expensive first',
    filters: { sort: 'price_desc', perPage: 10, inStock: true },
    seeAll: { sort: 'price_desc', inStock: true },
  },
];

export default function DiscoverScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient
      .invalidateQueries({ queryKey: ['products'] })
      .finally(() => setRefreshing(false));
  }, [queryClient]);

  if (!features.api) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader title="Discover" />
        <ErrorState error={new Error(missingConfigMessage() ?? 'Not configured.')} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Discover" />
      <ScrollView
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color('primary')}
          />
        }
      >
        <CategoryRail />

        {COLLECTIONS.map((collection) => (
          <ProductRail
            key={collection.id}
            title={collection.title}
            subtitle={collection.subtitle}
            filters={collection.filters}
            seeAll={collection.seeAll}
          />
        ))}

        <View className="mt-2 border-t border-border px-4 py-6">
          <AffiliateNote />
          <Text step="caption" tone="muted" className="mt-3">
            Trending, price drops and deals need signals the catalogue API does not expose
            yet. They arrive as their own collections rather than as a relabelled sort.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
