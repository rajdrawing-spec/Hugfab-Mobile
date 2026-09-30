/**
 * One order.
 *
 * `canReturn` is the server's answer, per line, and this screen only reads it. The
 * web module is explicit about why: the database refuses an ineligible return
 * anyway, so this decides what to *show*, and a button that will be refused is how
 * a screen teaches someone not to trust it.
 *
 * Requesting the return itself happens on the website — `requestReturn()` has no
 * route yet, and Phase 1 does not guess at one.
 */

import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { ErrorState, Skeleton } from '@/components/states';
import { formatDate } from '@/components/order-row';
import { getOrder } from '@/api/account';
import { formatMoney, isZero } from '@/lib/money';
import { openExternal, openWebPage } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import type { OrderLine, OrderShipment } from '@/api/types';

export default function OrderScreen(): React.JSX.Element {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const query = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: ({ signal }) => getOrder(orderId, signal),
    enabled: Boolean(orderId),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 bg-background p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        <Skeleton className="mt-3 h-24 w-full rounded-lg" />
      </View>
    );
  }

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const order = query.data;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <View className="bg-surface p-4">
        <Text step="h3">{order.orderNumber}</Text>
        <Text step="small" tone="muted" className="mt-1">
          {formatDate(order.createdAt)}
        </Text>

        <View className="mt-4 flex-row items-center justify-between">
          <Text step="body" tone="muted">
            Total
          </Text>
          <Text step="h3">{formatMoney(order.total)}</Text>
        </View>

        {!isZero(order.refunded) ? (
          <View className="mt-1 flex-row items-center justify-between">
            <Text step="small" tone="muted">
              Refunded
            </Text>
            <Text step="small" tone="info">
              {formatMoney(order.refunded)}
            </Text>
          </View>
        ) : null}
      </View>

      {order.shipments.length > 0 ? (
        <View className="bg-surface mt-3 p-4">
          <Text step="h3">Parcels</Text>
          <Text step="caption" tone="muted" className="mt-1">
            An order can ship in more than one parcel, so tracking belongs to the parcel
            rather than to a single item.
          </Text>
          <View className="mt-3">
            {order.shipments.map((shipment) => (
              <ShipmentRow key={shipment.id} shipment={shipment} />
            ))}
          </View>
        </View>
      ) : null}

      <View className="bg-surface mt-3 p-4">
        <Text step="h3">Items</Text>
        <View className="mt-3">
          {order.lines.map((line) => (
            <OrderLineRow key={line.id} line={line} />
          ))}
        </View>
      </View>

      <View className="p-4">
        <Button
          label="Manage this order on the website"
          variant="outline"
          pill
          fullWidth
          onPress={() => void openWebPage(`/account/orders/${order.id}`)}
        />
      </View>
    </ScrollView>
  );
}

/**
 * A shipping provider's own status word, made readable.
 *
 * `DetailShipment.status` is a free string from the courier — there is no enum
 * and no label map in the web app to borrow, so this does the one safe thing:
 * `in_transit` becomes "In transit". Inventing a friendlier vocabulary would
 * mean guessing at statuses this app has never seen, and a courier's word is
 * the word a shopper will see on the courier's own page.
 */
function readableStatus(status: string): string {
  const words = status.replace(/[_-]+/g, ' ').trim();
  if (words.length === 0) return 'Shipped';
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** One parcel: who is carrying it, its reference, and where it has got to. */
function ShipmentRow({ shipment }: { shipment: OrderShipment }): React.JSX.Element {
  return (
    <View className="mb-3 rounded-lg border border-border p-3">
      <View className="flex-row items-center justify-between">
        <Text step="small" weight="semibold">
          {shipment.courierName}
        </Text>
        <Badge label={readableStatus(shipment.status)} tone="info" />
      </View>

      <Text step="caption" tone="muted" className="mt-1">
        {shipment.awb}
      </Text>

      <Text step="caption" tone="muted" className="mt-1">
        {shipment.deliveredAt
          ? `Delivered ${formatDate(shipment.deliveredAt)}`
          : shipment.estimatedDeliveryDate
            ? `Expected ${formatDate(shipment.estimatedDeliveryDate)}`
            : `Shipped ${formatDate(shipment.shippedAt)}`}
      </Text>

      <Text step="caption" tone="muted" className="mt-1">
        {`${String(shipment.itemIds.length)} ${
          shipment.itemIds.length === 1 ? 'item' : 'items'
        } in this parcel`}
      </Text>

      {shipment.trackingUrl ? (
        <Button
          label="Track this parcel"
          variant="outline"
          size="sm"
          pill
          className="mt-3 self-start"
          onPress={() => void openExternal(shipment.trackingUrl ?? '')}
        />
      ) : null}
    </View>
  );
}

function OrderLineRow({ line }: { line: OrderLine }): React.JSX.Element {
  return (
    <View className="mb-3 flex-row rounded-lg border border-border p-3">
      <Image
        source={line.imageUrl}
        contentFit="cover"
        transition={150}
        className="bg-surface-2 h-20 w-16 rounded-md"
        accessibilityIgnoresInvertColors
      />

      <View className="flex-1 pl-3">
        <Text step="small" numberOfLines={2}>
          {line.title}
        </Text>
        {line.variantLabel ? (
          <Text step="caption" tone="muted" className="mt-0.5">
            {line.variantLabel}
          </Text>
        ) : null}
        <Text step="caption" tone="muted" className="mt-0.5">
          {`Quantity ${line.quantity} · ${formatMoney(line.lineTotal)}`}
        </Text>

        {line.returnStatus ? (
          <View className="mt-1.5">
            <Badge label={`Return ${line.returnStatus}`} tone="warning" />
          </View>
        ) : line.canReturn ? (
          <Text step="caption" tone="primary" className="mt-1.5">
            Eligible for return on the website
          </Text>
        ) : null}
      </View>
    </View>
  );
}
