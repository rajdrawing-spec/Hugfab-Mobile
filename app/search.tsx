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
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { SearchBar } from '@/components/search-bar';
import { AffiliateNote } from '@/components/affiliate-note';
import { Touchable } from '@/components/pressable';
import { FilterSheet, SortSheet, type DraftFilters } from '@/components/filter-sheet';
import { ProductCard } from '@/components/product-card';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/states';
import { listProducts, searchProducts, type ProductFilters } from '@/api/products';
import type { Gender, Paginated, ProductSummary } from '@/api/types';
import { color, elevation } from '@/theme';

const GENDERS: readonly Gender[] = ['women', 'men', 'unisex', 'kids'];

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
  const [filters, setFilters] = useState<DraftFilters>({
    gender: asGender(params.gender),
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    inStock: params.inStock === 'true',
  });
  const [sort, setSort] = useState<ProductFilters['sort']>(
    asSort(params.sort) ?? 'relevance',
  );
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const query_ = useMemo<ProductFilters>(
    () => ({
      q: debounced.length > 0 ? debounced : undefined,
      gender: filters.gender ?? undefined,
      sort,
      inStock: filters.inStock ? true : undefined,
      maxPrice:
        filters.maxPrice !== null && Number.isFinite(filters.maxPrice)
          ? filters.maxPrice
          : undefined,
      perPage: PER_PAGE,
    }),
    [debounced, filters, sort],
  );

  /** How many filters are on, for the button's badge. */
  const activeCount =
    (filters.gender ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.inStock ? 1 : 0);

  const query = useInfiniteQuery({
    queryKey: ['products', 'search', query_],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const page = { ...query_, page: pageParam };
      return query_.q
        ? searchProducts({ ...page, q: query_.q }, signal)
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
      </View>

      <ListingControls
        activeCount={activeCount}
        onFilter={() => setSheet('filter')}
        onSort={() => setSheet('sort')}
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing matched"
          body={
            query_.q
              ? `No products for "${query_.q ?? ''}" with these filters. Try fewer filters or a shorter search.`
              : 'No products match these filters yet.'
          }
          actionLabel="Clear filters"
          onAction={() => {
            setFilters({ gender: null, maxPrice: null, inStock: false });
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
      <FilterSheet
        visible={sheet === 'filter'}
        value={filters}
        onClose={() => setSheet(null)}
        onApply={(next) => {
          setFilters(next);
          setSheet(null);
        }}
      />
      <SortSheet
        visible={sheet === 'sort'}
        value={sort}
        onClose={() => setSheet(null)}
        onSelect={(next) => {
          setSort(next);
          setSheet(null);
        }}
      />
    </View>
  );
}

/**
 * Filter and Sort, pinned above the grid. The brief asks for these to be sticky,
 * and they are the two controls a shopper reaches for most on a listing — putting
 * them in a scrolling header means scrolling back up to change your mind.
 */
function ListingControls({
  activeCount,
  onFilter,
  onSort,
}: {
  activeCount: number;
  onFilter: () => void;
  onSort: () => void;
}): React.JSX.Element {
  return (
    <View className="bg-surface flex-row border-b border-border">
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={
          activeCount > 0 ? `Filter, ${String(activeCount)} applied` : 'Filter'
        }
        onPress={onFilter}
        containerClassName="flex-1"
        className="flex-row items-center justify-center py-3"
      >
        <Ionicons name="options-outline" size={17} color={color('text')} />
        <Text step="small" weight="medium" className="ml-1.5">
          Filter
        </Text>
        {activeCount > 0 ? (
          <View className="bg-primary ml-1.5 h-5 min-w-5 items-center justify-center rounded-full px-1">
            <Text step="caption" tone="primary-foreground" weight="semibold">
              {String(activeCount)}
            </Text>
          </View>
        ) : null}
      </Touchable>

      <View className="w-px bg-border" />

      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Sort"
        onPress={onSort}
        containerClassName="flex-1"
        className="flex-row items-center justify-center py-3"
      >
        <Ionicons name="swap-vertical-outline" size={17} color={color('text')} />
        <Text step="small" weight="medium" className="ml-1.5">
          Sort
        </Text>
      </Touchable>
    </View>
  );
}

function asGender(value: string | undefined): Gender | null {
  return GENDERS.some((option) => option === value) ? (value as Gender) : null;
}

const SORT_VALUES = ['relevance', 'price_asc', 'price_desc', 'newest'] as const;

function asSort(value: string | undefined): ProductFilters['sort'] | null {
  return SORT_VALUES.some((option) => option === value)
    ? (value as ProductFilters['sort'])
    : null;
}
