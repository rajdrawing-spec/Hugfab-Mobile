/**
 * The Bag.
 *
 * Every figure on this screen came from the server. The subtotal is `cart.subtotal`
 * and not a sum of the lines — `src/modules/cart/types.ts` is explicit that nothing
 * in a cart carries a price the client supplied, and the two figures agree right up
 * until a promotion, a flash-deal hold or an unavailable line makes them disagree
 * silently. The one that would be wrong is the one computed here.
 *
 * Checkout is native now: `/checkout` picks a saved address and places the order,
 * and only the payment step opens the website — the page HugFab already uses for
 * an order id, where Razorpay's *web* checkout runs. See `app/checkout.tsx`.
 *
 * A HUGFAB Deal is not a line. It arrives as several one-unit lines sharing a
 * `cartDealId`, each priced at its share of the deal price, so they are drawn
 * under their deal rather than loose in the list, where each price would read as
 * wrong on its own.
 */

import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Price } from '@/components/price';
import { EmptyState, ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { getCart, removeCartDeal, setCartItemQuantity } from '@/api/cart';
import { formatMoney } from '@/lib/money';
import { queryKeys } from '@/query/keys';
import { elevation } from '@/theme';
import { useAuth } from '@/auth/session';
import type { CartDeal, CartLine } from '@/api/types';

export default function CartScreen(): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: ({ signal }) => getCart(signal),
    enabled: status === 'signedIn',
  });

  const setQuantity = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      setCartItemQuantity(itemId, quantity),
    // The route returns the whole new cart, so the response *is* the new state —
    // no invalidate-and-refetch round trip, and no window where the totals and the
    // lines disagree.
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(), cart),
  });

  /** A deal comes out whole: half a bundle is not a thing that has a price. */
  const dropDeal = useMutation({
    mutationFn: (cartDealId: string) => removeCartDeal(cartDealId),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(), cart),
  });

  if (status === 'loading') return <CartSkeleton />;

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in to see your bag"
        body="Your bag is kept with your account so it is the same one you left on the website."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  if (query.isPending) return <CartSkeleton />;

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const cart = query.data;

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Products you add are held here until you check out."
        actionLabel="Browse the catalogue"
        onAction={() => router.push('/search')}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-4 pb-2">
        {cart.deals.map((deal) => (
          <DealGroup
            key={deal.cartDealId}
            deal={deal}
            lines={cart.lines.filter((line) => line.cartDealId === deal.cartDealId)}
            busy={dropDeal.isPending && dropDeal.variables === deal.cartDealId}
            onRemove={() => dropDeal.mutate(deal.cartDealId)}
          />
        ))}

        {cart.lines
          .filter((line) => line.cartDealId === null)
          .map((line) => (
            <CartRow
              key={line.itemId}
              line={line}
              busy={
                setQuantity.isPending && setQuantity.variables?.itemId === line.itemId
              }
              onQuantity={(quantity) =>
                setQuantity.mutate({ itemId: line.itemId, quantity })
              }
            />
          ))}

        {cart.unavailable > 0 ? (
          <View className="bg-warning-soft mt-1 rounded-md p-3">
            <Text step="small" tone="warning">
              {`${cart.unavailable} ${
                cart.unavailable === 1 ? 'item is' : 'items are'
              } no longer available. Remove ${
                cart.unavailable === 1 ? 'it' : 'them'
              } to check out.`}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="bg-surface border-t border-border p-4">
        <View className="flex-row items-center justify-between">
          <Text step="body" tone="muted">
            {`Subtotal · ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`}
          </Text>
          <Text step="h3">{formatMoney(cart.subtotal)}</Text>
        </View>

        <Button
          label="Check out"
          pill
          fullWidth
          className="mt-3"
          disabled={cart.unavailable > 0}
          onPress={() => router.push('/checkout')}
        />
        <Text step="caption" tone="muted" className="mt-2 text-center">
          Delivery and payment next. Payment opens hugfab.com in a secure browser.
        </Text>
      </View>
    </View>
  );
}

/**
 * A HUGFAB Deal and the units that make it up.
 *
 * The deal's price is the deal's, not a sum: each unit is priced at its share,
 * and adding the shares back up is the kind of arithmetic that agrees with the
 * server until the day it does not. So the units are listed without prices —
 * they are what is in the bundle, and the bundle is what costs something.
 *
 * `available: false` is shown rather than hidden, with the server's own
 * `reason`. A deal that ended while the bag sat open blocks checkout, and a
 * shopper needs to see which one.
 */
function DealGroup({
  deal,
  lines,
  busy,
  onRemove,
}: {
  deal: CartDeal;
  lines: CartLine[];
  busy: boolean;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <View
      style={elevation('sm')}
      className={`bg-surface border-primary mb-3 rounded-lg border p-3 ${
        busy ? 'opacity-50' : ''
      }`}
    >
      <View className="flex-row items-center">
        <Badge label="Deal" tone="primary" />
        <Text step="small" className="ml-2 flex-1" numberOfLines={2}>
          {deal.title}
        </Text>
      </View>

      {lines.map((line) => (
        <View key={line.itemId} className="mt-2 flex-row items-center">
          <Image
            source={line.imageUrl}
            contentFit="cover"
            transition={150}
            className="bg-surface-2 h-12 w-10 rounded-sm"
            accessibilityIgnoresInvertColors
          />
          <Text step="caption" tone="muted" className="ml-2 flex-1" numberOfLines={1}>
            {[line.title, line.size, line.color].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}

      <View className="mt-3 flex-row items-center">
        {deal.price ? (
          <Text step="body">{formatMoney(deal.price)}</Text>
        ) : (
          <Badge label="No longer available" tone="warning" />
        )}
        {deal.savings && deal.available ? (
          <Text step="caption" tone="accent" className="ml-2">
            {`You save ${formatMoney(deal.savings)}`}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove the ${deal.title} deal from your bag`}
          disabled={busy}
          onPress={onRemove}
          className="ml-auto p-1"
        >
          <Text step="small" tone="muted">
            Remove
          </Text>
        </Pressable>
      </View>

      {!deal.available && deal.reason ? (
        <Text step="caption" tone="warning" className="mt-1">
          {deal.reason}
        </Text>
      ) : null}
    </View>
  );
}

function CartRow({
  line,
  busy,
  onQuantity,
}: {
  line: CartLine;
  busy: boolean;
  onQuantity: (quantity: number) => void;
}): React.JSX.Element {
  const variant = [line.size, line.color].filter(Boolean).join(' · ');

  return (
    <View
      style={elevation('sm')}
      className={`bg-surface mb-3 flex-row rounded-lg p-3 ${busy ? 'opacity-50' : ''}`}
    >
      <Image
        source={line.imageUrl}
        contentFit="cover"
        transition={150}
        className="bg-surface-2 h-24 w-20 rounded-md"
        accessibilityIgnoresInvertColors
      />

      <View className="flex-1 pl-3">
        <Text step="small" numberOfLines={2}>
          {line.title}
        </Text>
        {variant ? (
          <Text step="caption" tone="muted" className="mt-0.5">
            {variant}
          </Text>
        ) : null}

        <View className="mt-1.5">
          {line.unitPrice ? (
            <Price price={line.unitPrice} />
          ) : (
            <Badge label="Unavailable" tone="warning" />
          )}
        </View>

        <View className="mt-2 flex-row items-center">
          <QuantityButton
            label="Decrease quantity"
            symbol="−"
            disabled={busy}
            onPress={() => onQuantity(line.quantity - 1)}
          />
          <Text step="small" className="w-10 text-center">
            {String(line.quantity)}
          </Text>
          <QuantityButton
            label="Increase quantity"
            symbol="+"
            // `stock` null means stock is not tracked, not that none is held — so a
            // null must not disable the button.
            disabled={busy || (line.stock !== null && line.quantity >= line.stock)}
            onPress={() => onQuantity(line.quantity + 1)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${line.title} from your bag`}
            disabled={busy}
            onPress={() => onQuantity(0)}
            className="ml-auto p-1"
          >
            <Text step="small" tone="muted">
              Remove
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function QuantityButton({
  label,
  symbol,
  disabled,
  onPress,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-8 w-8 items-center justify-center rounded-sm border border-border ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Text step="body">{symbol}</Text>
    </Pressable>
  );
}

function CartSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background p-4" accessibilityLabel="Loading your bag">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="mb-3 h-28 w-full rounded-lg" />
      ))}
    </View>
  );
}
