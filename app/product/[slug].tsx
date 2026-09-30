/**
 * The product screen.
 *
 * `bestOffer` is `offers[0]` and the API orders offers in-stock-first then
 * cheapest, so the Best Price badge and the top of the list agree by construction
 * — this screen does not re-sort or re-pick, because a second calculation is a
 * second chance to disagree with the comparison table on the website.
 *
 * "Add to bag" is offered only for a variant the server called available, and it
 * goes through `/api/cart/items` — which does not exist yet, so it reports that
 * honestly (`docs/API-GAPS.md` §3) rather than appearing to work.
 */

import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge, AvailabilityBadge } from '@/components/badge';
import { NoPrice, Price } from '@/components/price';
import { RetailerBadge } from '@/components/retailer-badge';
import { WishlistHeart } from '@/components/wishlist-heart';
import { AffiliateNote } from '@/components/affiliate-note';
import { ErrorState, Skeleton } from '@/components/states';
import { getProduct } from '@/api/products';
import { addCartItem } from '@/api/cart';
import { describeError } from '@/api/errors';
import { openClickOut } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';
import type { ProductVariant } from '@/api/types';

export default function ProductScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { status } = useAuth();
  const { width } = useWindowDimensions();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [bagMessage, setBagMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: ({ signal }) => getProduct(slug, signal),
    enabled: Boolean(slug),
  });

  const addToBag = useMutation({
    mutationFn: (variant: string) => addCartItem(variant, 1),
    onSuccess: () => setBagMessage('Added to your bag.'),
    onError: (error) => setBagMessage(describeError(error).message),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 bg-background">
        <Skeleton className="w-full" style={{ height: width }} />
        <View className="p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-6 w-4/5" />
          <Skeleton className="mt-3 h-8 w-1/2" />
        </View>
      </View>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const product = query.data;
  const offer = product.bestOffer;
  // The detail response carries every offer, so the count is the list's length —
  // `offerCount` is the grid's field, and reading it here would be undefined.
  const offerCount = product.offers.length;
  const selected = product.variants.find((variant) => variant.id === variantId) ?? null;

  return (
    <>
      <Stack.Screen options={{ title: product.brand?.name ?? 'Product' }} />
      <ScrollView className="flex-1 bg-background">
        <View>
          <Gallery imageUrls={product.imageUrls} size={width} title={product.title} />
          <View className="absolute right-4 top-4">
            <WishlistHeart productId={product.id} title={product.title} />
          </View>
        </View>

        <View className="bg-surface p-4">
          {product.brand ? (
            <Text step="small" tone="muted">
              {product.brand.name}
            </Text>
          ) : null}
          <Text step="h2" className="mt-1">
            {product.title}
          </Text>

          {product.isMock ? (
            <View className="mt-3">
              <Badge label="Sample data — not a real price" tone="warning" />
            </View>
          ) : null}

          <View className="mt-4">
            {offer ? (
              <>
                <Price
                  price={offer.price}
                  originalPrice={offer.originalPrice}
                  discountPercent={offer.discountPercent}
                  size="lg"
                />
                <View className="mt-3 flex-row items-center">
                  <Badge label="Best price" tone="primary" variant="solid" />
                  <View className="ml-3 flex-1">
                    <RetailerBadge retailer={offer.retailer} size="md" />
                  </View>
                </View>
                <View className="mt-3">
                  <AvailabilityBadge availability={offer.availability} />
                </View>
              </>
            ) : (
              <NoPrice />
            )}
          </View>

          {offer ? (
            <>
              <Button
                label={`Buy at ${offer.retailer.name}`}
                pill
                fullWidth
                className="mt-5"
                onPress={() => void openClickOut(offer.clickPath)}
              />
              {/* PRD §74: the disclosure belongs beside the outbound link. */}
              <AffiliateNote className="mt-3" />
            </>
          ) : null}

          {offerCount > 1 ? (
            <Link
              href={{ pathname: '/offers/[slug]', params: { slug: product.slug } }}
              asChild
            >
              <Pressable accessibilityRole="link" className="mt-3 py-2">
                <Text step="small" tone="primary" weight="semibold">
                  {`Compare all ${offerCount} offers`}
                </Text>
              </Pressable>
            </Link>
          ) : null}
        </View>

        {product.variants.length > 0 ? (
          <View className="bg-surface mt-3 p-4">
            <Text step="h3">Size</Text>
            <View className="mt-3 flex-row flex-wrap">
              {product.variants.map((variant) => (
                <VariantChip
                  key={variant.id}
                  variant={variant}
                  selected={variantId === variant.id}
                  onPress={() => {
                    setBagMessage(null);
                    setVariantId(variant.id);
                  }}
                />
              ))}
            </View>

            <Button
              label={status === 'signedIn' ? 'Add to bag' : 'Sign in to add to bag'}
              variant="outline"
              pill
              fullWidth
              className="mt-4"
              loading={addToBag.isPending}
              disabled={selected === null || selected.availability !== 'in_stock'}
              onPress={() => {
                if (status !== 'signedIn') {
                  router.push('/auth/login');
                  return;
                }
                if (selected) addToBag.mutate(selected.id);
              }}
            />
            {selected === null ? (
              <Text step="caption" tone="muted" className="mt-2">
                Choose a size first.
              </Text>
            ) : null}
            {bagMessage ? (
              <Text
                step="small"
                tone="muted"
                className="mt-2"
                accessibilityLiveRegion="polite"
              >
                {bagMessage}
              </Text>
            ) : null}
          </View>
        ) : null}

        {product.description ? (
          <View className="bg-surface mt-3 p-4">
            <Text step="h3">Details</Text>
            <Text step="body" tone="muted" className="mt-2">
              {product.description}
            </Text>
          </View>
        ) : null}

        <View className="bg-surface mt-3 mb-10 p-4">
          <Text step="h3">Find similar</Text>
          <Text step="small" tone="muted" className="mt-2">
            Similar products are matched on the website. They arrive in the app with the
            recommendations endpoint.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

/**
 * A paging gallery. Square at the screen's width rather than the catalogue's 3:4,
 * because a portrait image cropped to a phone's full width leaves no room for the
 * price without scrolling.
 */
function Gallery({
  imageUrls,
  size,
  title,
}: {
  imageUrls: string[];
  size: number;
  title: string;
}): React.JSX.Element {
  if (imageUrls.length === 0) {
    return <View className="bg-surface-2 w-full" style={{ height: size }} />;
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
      {imageUrls.map((url, index) => (
        <Image
          key={url}
          source={url}
          contentFit="cover"
          transition={150}
          style={{ width: size, height: size }}
          className="bg-surface-2"
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${title}, image ${index + 1} of ${imageUrls.length}`}
        />
      ))}
    </ScrollView>
  );
}

function VariantChip({
  variant,
  selected,
  onPress,
}: {
  variant: ProductVariant;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const buyable = variant.availability === 'in_stock';
  const label = variant.size ?? variant.color ?? variant.sku ?? 'One size';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !buyable }}
      accessibilityLabel={buyable ? label : `${label}, unavailable`}
      disabled={!buyable}
      onPress={onPress}
      className={`mr-2 mb-2 rounded-sm border px-4 py-2 ${
        selected ? 'bg-primary border-primary' : 'bg-surface border-border'
      } ${buyable ? '' : 'opacity-40'}`}
    >
      <Text step="small" tone={selected ? 'primary-foreground' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}
