/**
 * Every offer for one product, in the order the API returned them: in stock first,
 * then cheapest. An out-of-stock offer sorts below every available one however
 * cheap it is, because a price you cannot buy at is not a competitive price — that
 * is the web app's rule and this screen does not re-sort.
 *
 * Each row opens `offer.clickPath` in a browser. That path is HugFab's own 302,
 * which is where attribution is recorded; the retailer's tracked URL is never sent
 * to this app, so there is nothing else here that could be opened.
 */

import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Badge, AvailabilityBadge } from '@/components/badge';
import { Price } from '@/components/price';
import { RetailerBadge } from '@/components/retailer-badge';
import { AffiliateNote } from '@/components/affiliate-note';
import { Touchable } from '@/components/pressable';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { getProduct } from '@/api/products';
import { openClickOut } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import { elevation } from '@/theme';
import type { ProductOffer } from '@/api/types';

export default function OffersScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const query = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: ({ signal }) => getProduct(slug, signal),
    enabled: Boolean(slug),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 bg-background p-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="mb-3 h-24 w-full rounded-lg" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const offers = query.data.offers;

  if (offers.length === 0) {
    return (
      <EmptyState
        title="No offers right now"
        body="No retailer is currently listing this product. It may come back when a feed next runs."
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      data={offers}
      keyExtractor={(offer) => `${offer.retailer.id}-${offer.price.amountMinor}`}
      contentContainerClassName="p-4"
      ListHeaderComponent={
        <Text step="small" tone="muted" className="pb-3">
          In stock first, then cheapest.
        </Text>
      }
      ListFooterComponent={<AffiliateNote className="pt-4" />}
      renderItem={({ item, index }) => <OfferRow offer={item} isBest={index === 0} />}
    />
  );
}

function OfferRow({
  offer,
  isBest,
}: {
  offer: ProductOffer;
  isBest: boolean;
}): React.JSX.Element {
  return (
    <Touchable
      accessibilityRole="link"
      accessibilityLabel={`Buy at ${offer.retailer.name}`}
      press="card"
      onPress={() => void openClickOut(offer.clickPath)}
      style={elevation(isBest ? 'md' : 'sm')}
      className={`bg-surface mb-3 rounded-lg p-4 ${
        isBest ? 'border border-primary' : ''
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <RetailerBadge retailer={offer.retailer} size="md" />
        </View>
        {isBest ? <Badge label="Best price" tone="primary" variant="solid" /> : null}
      </View>

      <View className="mt-3">
        <Price
          price={offer.price}
          originalPrice={offer.originalPrice}
          discountPercent={offer.discountPercent}
        />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <AvailabilityBadge availability={offer.availability} />
        <Text step="small" tone="primary" weight="semibold">
          Buy →
        </Text>
      </View>
    </Touchable>
  );
}
