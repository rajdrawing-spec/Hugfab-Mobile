/**
 * An order in a list.
 *
 * The status shown is `fulfilmentStatus` — where the parcel is — rather than
 * `status`, which is the payment's state. A shopper looking at their orders is
 * asking about the parcel; "paid" tells them nothing they did not already know.
 *
 * The colours follow the rule `modules/orders/badge.ts` sets on the web: green when
 * it is done, amber while someone is waiting, blue while it is moving, grey when it
 * stopped, red only when something failed.
 */

import { Pressable, View } from 'react-native';
import { Text } from './text';
import { Badge } from './badge';
import { formatMoney } from '@/lib/money';
import { elevation } from '@/theme';
import type { FulfilmentStatus, OrderSummary } from '@/api/types';

const STATUS: Record<
  FulfilmentStatus,
  { label: string; tone: 'success' | 'warning' | 'info' | 'muted' }
> = {
  awaiting: { label: 'Awaiting confirmation', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  processing: { label: 'Being prepared', tone: 'info' },
  packed: { label: 'Packed', tone: 'info' },
  shipped: { label: 'On its way', tone: 'info' },
  out_for_delivery: { label: 'Out for delivery', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  return_requested: { label: 'Return requested', tone: 'warning' },
  returned: { label: 'Returned', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export function OrderRow({
  order,
  onPress,
}: {
  order: OrderSummary;
  onPress: () => void;
}): React.JSX.Element {
  const status = STATUS[order.fulfilmentStatus];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${status.label}`}
      onPress={onPress}
      style={elevation('sm')}
      className="bg-surface mb-3 rounded-lg p-3"
    >
      <View className="flex-row items-center justify-between">
        <Text step="small" weight="semibold">
          {order.orderNumber}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text step="caption" tone="muted">
          {`${formatDate(order.createdAt)} · ${order.lineCount} ${
            order.lineCount === 1 ? 'item' : 'items'
          }`}
        </Text>
        <Text step="small" weight="semibold">
          {formatMoney(order.total)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The same locale the prices use. A date formatted from the handset's locale beside
 * a price formatted from the catalogue's would be two conventions in one row.
 */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
