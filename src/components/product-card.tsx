/**
 * A product in a grid or a rail, built to `docs/ui-ux-guide.md` §4: image,
 * wishlist heart top-right, brand, name, price cluster, then the retailer.
 *
 * Three things the first version got wrong, all of them in that sentence. There
 * was no heart, so saving a product meant opening it first. There was no
 * retailer, so a comparison app was not saying who was selling. And the price sat
 * at body weight, which made the cheapest figure on screen the least noticeable
 * thing on the card.
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

import { View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text } from './text';
import { Badge } from './badge';
import { NoPrice, Price } from './price';
import { RetailerBadge } from './retailer-badge';
import { Touchable } from './pressable';
import { WishlistHeart } from './wishlist-heart';
import { elevation } from '@/theme';
import type { ProductSummary } from '@/api/types';

export function ProductCard({ product }: { product: ProductSummary }): React.JSX.Element {
  const router = useRouter();
  const offer = product.bestOffer;
  const image = product.imageUrls[0] ?? null;

  return (
    <View className="flex-1 p-2">
      <Touchable
        accessibilityRole="link"
        accessibilityLabel={product.title}
        press="card"
        onPress={() =>
          router.push({ pathname: '/product/[slug]', params: { slug: product.slug } })
        }
        style={elevation('sm')}
        className="bg-surface overflow-hidden rounded-lg"
      >
        <View>
          <Image
            source={image}
            contentFit="cover"
            transition={150}
            className="bg-surface-2 aspect-[3/4] w-full"
            accessibilityIgnoresInvertColors
          />
          <View className="absolute right-2 top-2">
            <WishlistHeart productId={product.id} title={product.title} />
          </View>
          {product.isMock ? (
            <View className="absolute left-2 top-2">
              <Badge label="Sample data" tone="warning" />
            </View>
          ) : null}
        </View>

        <View className="p-3">
          {product.brand ? (
            <Text step="caption" tone="muted" weight="medium" numberOfLines={1}>
              {product.brand.name.toUpperCase()}
            </Text>
          ) : null}
          <Text step="small" numberOfLines={2} className="mt-1 min-h-10">
            {product.title}
          </Text>

          <View className="mt-2">
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

          {offer ? (
            <View className="mt-2.5 border-t border-border pt-2.5">
              <RetailerBadge retailer={offer.retailer} />
              {product.offerCount > 1 ? (
                <Text step="caption" tone="primary" weight="semibold" className="mt-1">
                  {`+${String(product.offerCount - 1)} more ${
                    product.offerCount === 2 ? 'retailer' : 'retailers'
                  }`}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Touchable>
    </View>
  );
}
