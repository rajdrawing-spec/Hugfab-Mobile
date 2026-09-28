/**
 * A price, as the comparison table renders it: today's figure, the retailer's
 * struck-through "was" beside it, and the reduction as a percentage.
 *
 * Every figure here arrives from the API. `discountPercent` in particular is the
 * server's number, computed from a retailer-published original — `docs/api.md`
 * records that the schema refuses an "original" below the current price precisely
 * so the percentage is never a flattering fiction. Deriving it here from the two
 * prices would work and would lose that guarantee.
 */

import { View } from 'react-native';
import { Text } from './text';
import { formatMoney, type Money } from '@/lib/money';

export function Price({
  price,
  originalPrice,
  discountPercent,
  size = 'md',
}: {
  price: Money;
  originalPrice?: Money | null;
  discountPercent?: number | null;
  size?: 'md' | 'lg';
}): React.JSX.Element {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text step={size === 'lg' ? 'h2' : 'body'} weight="semibold">
        {formatMoney(price)}
      </Text>
      {originalPrice ? (
        <Text step="small" tone="muted" className="line-through">
          {formatMoney(originalPrice)}
        </Text>
      ) : null}
      {typeof discountPercent === 'number' ? (
        <Text step="small" tone="success" weight="semibold">
          {`${discountPercent}% OFF`}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * What a card shows when a product has no offer at all. Not "₹0", and not a blank
 * — an absent price is information, and the card still has to be tappable.
 */
export function NoPrice(): React.JSX.Element {
  return (
    <Text step="small" tone="muted">
      No price right now
    </Text>
  );
}
