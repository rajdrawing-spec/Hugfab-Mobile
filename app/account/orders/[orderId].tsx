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
import { openWebPage } from '@/lib/links';
import { queryKeys } from '@/query/keys';
import type { OrderLine } from '@/api/types';

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

      <View className="bg-surface mt-3 p-4">
        <Text step="h3">Items</Text>
        <View className="mt-3">
          {order.lines.map((line) => (
            <OrderLineRow key={line.orderItemId} line={line} />
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

        {line.trackingReference ? (
          <Text step="caption" tone="muted" className="mt-1">
            {line.carrier
              ? `${line.carrier} · ${line.trackingReference}`
              : line.trackingReference}
          </Text>
        ) : null}

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
