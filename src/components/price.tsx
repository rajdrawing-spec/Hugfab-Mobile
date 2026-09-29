/**
 * The price cluster — `docs/ui-ux-guide.md` §4 calls it the most repeated element
 * in the product, and fixes its order and its weights:
 *
 *     ₹1,899          ₹2,999           37% OFF
 *     current         original,        discount,
 *     (h3, bold)      struck, muted    green, text-only
 *
 * Every figure arrives from the API. `discountPercent` in particular is the
 * server's number, computed from a retailer-published original — `docs/api.md`
 * records that the schema refuses an "original" below the current price precisely
 * so the percentage is never a flattering fiction. Deriving it here from the two
 * prices would work and would throw that guarantee away.
 *
 * The green is `accent`, not `success`: the guide asks for a positive signal on a
 * saving, and `success` is the status colour for a delivered parcel.
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
  /** 'lg' on a product page, 'md' on a card, 'sm' in a dense row. */
  size?: 'sm' | 'md' | 'lg';
}): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap items-baseline">
      <Text step={size === 'lg' ? 'h1' : size === 'md' ? 'h3' : 'body'} weight="bold">
        {formatMoney(price)}
      </Text>
      {originalPrice ? (
        <Text
          step={size === 'sm' ? 'caption' : 'small'}
          tone="muted"
          className="ml-2 line-through"
        >
          {formatMoney(originalPrice)}
        </Text>
      ) : null}
      {typeof discountPercent === 'number' ? (
        <Text
          step={size === 'sm' ? 'caption' : 'small'}
          tone="accent"
          weight="semibold"
          className="ml-2"
        >
          {`${String(discountPercent)}% OFF`}
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
