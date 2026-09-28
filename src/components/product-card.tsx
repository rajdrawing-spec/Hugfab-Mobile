/**
 * A product in a grid or a rail.
 *
 * `expo-image` rather than React Native's `Image`: it caches to disk between
 * launches and holds a placeholder through the fade, which on a catalogue screen
 * is the difference between a grid that settles and one that flashes white.
 *
 * `isMock` is surfaced rather than hidden. Production never returns a mock row, so
 * this badge only ever appears in development — but it appears, because PRD §60
 * and §69 forbid presenting seed prices as real and a silent flag is how that
 * happens by accident.
 */

import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Text } from './text';
import { Badge } from './badge';
import { NoPrice, Price } from './price';
import type { ProductSummary } from '@/api/types';

export function ProductCard({ product }: { product: ProductSummary }): React.JSX.Element {
  const offer = product.bestOffer;
  const image = product.imageUrls[0] ?? null;

  return (
    <Link href={{ pathname: '/product/[slug]', params: { slug: product.slug } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={product.title}
        className="flex-1 p-2"
      >
        <View className="bg-surface rounded-lg overflow-hidden border border-border">
          <Image
            source={image}
            contentFit="cover"
            transition={150}
            className="aspect-[3/4] w-full bg-surface-2"
            accessibilityIgnoresInvertColors
          />
          <View className="p-2.5">
            {product.brand ? (
              <Text step="caption" tone="muted" numberOfLines={1}>
                {product.brand.name}
              </Text>
            ) : null}
            <Text step="small" numberOfLines={2} className="mt-0.5 min-h-10">
              {product.title}
            </Text>
            <View className="mt-1.5">
              {offer ? (
                <Price
                  price={offer.price}
                  originalPrice={offer.originalPrice}
                  discountPercent={offer.discountPercent}
                />
              ) : (
                <NoPrice />
              )}
            </View>
            {product.offerCount > 1 ? (
              <Text step="caption" tone="muted" className="mt-1">
                {`${product.offerCount} retailers`}
              </Text>
            ) : null}
            {product.isMock ? (
              <View className="mt-1.5">
                <Badge label="Sample data" tone="warning" />
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
