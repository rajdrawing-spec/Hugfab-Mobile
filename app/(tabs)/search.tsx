/**
 * Search and browse.
 *
 * Two endpoints, one screen: `/api/search` requires `q` and answers 400 without
 * it, so an empty box browses `/api/products` instead. Both take the same filters
 * and return the same page shape, which is why the switch is one ternary rather
 * than two screens.
 *
 * The query is debounced by 350ms. `docs/api.md` puts the `search` budget at 60
 * requests a minute, and a request per keystroke spends that in twelve characters —
 * then every shopper on the same mobile gateway is rate-limited.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/text';
import { Chip } from '@/components/chip';
import { SearchBar } from '@/components/search-bar';
import { AffiliateNote } from '@/components/affiliate-note';
import { ProductCard } from '@/components/product-card';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/states';
import {
  listProducts,
  searchProducts,
  SORT_OPTIONS,
  type ProductFilters,
} from '@/api/products';
import type { Gender, Paginated, ProductSummary } from '@/api/types';
import { elevation } from '@/theme';

const GENDERS: readonly { value: Gender; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];

const PER_PAGE = 24;

export default function SearchScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  // A "See all" from a home rail arrives as params, so the screen opens on that
  // filter rather than making the person rebuild it.
  const params = useLocalSearchParams<{
    q?: string;
    gender?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>();

  const [text, setText] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(params.q ?? '');
  const [gender, setGender] = useState<Gender | null>(asGender(params.gender));
  const [sort, setSort] = useState<ProductFilters['sort']>(
    asSort(params.sort) ?? 'relevance',
  );
  const [inStockOnly, setInStockOnly] = useState(params.inStock === 'true');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  const filters = useMemo<ProductFilters>(
    () => ({
      q: debounced.length > 0 ? debounced : undefined,
      gender: gender ?? undefined,
      sort,
      inStock: inStockOnly ? true : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      perPage: PER_PAGE,
    }),
    [debounced, gender, sort, inStockOnly, maxPrice],
  );

  const query = useInfiniteQuery({
    queryKey: ['products', 'search', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const page = { ...filters, page: pageParam };
      return filters.q
        ? searchProducts({ ...page, q: filters.q }, signal)
        : listProducts(page, signal);
    },
    getNextPageParam: (last: Paginated<ProductSummary>) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <View className="flex-1 bg-background">
      <View
        className="bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8, ...elevation('sm') }}
      >
        <SearchBar value={text} onChangeText={setText} autoFocus={false} />

        <View className="mt-3 flex-row flex-wrap">
          {GENDERS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={gender === option.value}
              onPress={() => setGender(gender === option.value ? null : option.value)}
            />
          ))}
          <Chip
            label="In stock"
            selected={inStockOnly}
            onPress={() => setInStockOnly(!inStockOnly)}
          />
        </View>

        <View className="flex-row flex-wrap">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={sort === option.value}
              onPress={() => setSort(option.value)}
            />
          ))}
        </View>
      </View>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing matched"
          body={
            filters.q
              ? `No products for "${filters.q}" with these filters. Try fewer filters or a shorter search.`
              : 'No products match these filters yet.'
          }
          actionLabel="Clear filters"
          onAction={() => {
            setGender(null);
            setInStockOnly(false);
            setSort('relevance');
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-2 pb-6 pt-2"
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={
            <Text step="caption" tone="muted" className="px-2 pb-2">
              {`${String(total)} ${total === 1 ? 'product' : 'products'}`}
            </Text>
          }
          ListFooterComponent={
            <>
              {query.isFetchingNextPage ? <ProductGridSkeleton count={2} /> : null}
              {!query.hasNextPage ? <AffiliateNote className="px-2 pb-4 pt-6" /> : null}
            </>
          }
        />
      )}
    </View>
  );
}

function asGender(value: string | undefined): Gender | null {
  return GENDERS.some((option) => option.value === value) ? (value as Gender) : null;
}

function asSort(value: string | undefined): ProductFilters['sort'] | null {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ProductFilters['sort'])
    : null;
}
