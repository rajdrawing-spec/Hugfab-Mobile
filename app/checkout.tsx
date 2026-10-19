/**
 * Checkout: choose where it goes, place the order, then pay on the website.
 *
 * WHY PAYMENT LEAVES THE APP, AND WHY THAT IS NOT A CLIMBDOWN
 * -----------------------------------------------------------
 * `POST /api/checkout` writes the order and answers with `payUrl` — the
 * website's own payment page for that order id. The app opens it in the
 * in-app browser and reads the order back afterwards.
 *
 * That is the design, not a stopgap for Expo Go. HugFab takes payment with
 * Razorpay's *web* checkout; the page is reachable by order id because a guest
 * has no account to find an order through, and it settles itself when the
 * webhook is late. Reimplementing any of that natively would mean a second
 * payment path to keep correct, for a screen a shopper sees once per order.
 *
 * What stays native is everything a shopper touches repeatedly: the bag, the
 * address, the totals, the confirmation.
 *
 * NO AMOUNT IS SENT FROM HERE
 * ---------------------------
 * The order's total is computed by the database from live prices. This screen
 * sends an address and, if the shopper typed one, a promotion *code* — never
 * the discount it is worth. A client that could send an amount could choose
 * what to pay.
 */

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCart, placeOrder } from '@/api/cart';
import { getAddressBook } from '@/api/addresses';
import { describeError } from '@/api/errors';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { EmptyState, ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { Text } from '@/components/text';
import { useAuth } from '@/auth/session';
import { formatAddress } from '@/lib/address';
import { openExternal } from '@/lib/links';
import { formatMoney } from '@/lib/money';
import { queryKeys } from '@/query/keys';
import { elevation } from '@/theme';
import type { SavedAddress } from '@/api/types';

export default function CheckoutScreen(): React.JSX.Element {
  const { status, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promotionCode, setPromotionCode] = useState('');

  const cart = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: ({ signal }) => getCart(signal),
    enabled: status === 'signedIn',
  });

  const book = useQuery({
    queryKey: queryKeys.addresses(),
    queryFn: ({ signal }) => getAddressBook(signal),
    enabled: status === 'signedIn',
  });

  const order = useMutation({
    mutationFn: (address: SavedAddress) =>
      placeOrder({
        email: user?.email ?? '',
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        // Required by the schema, and empty is a legitimate value — the key
        // must survive even when there is no second line.
        line2: address.line2 ?? '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        promotionCode: promotionCode.trim() === '' ? undefined : promotionCode.trim(),
      }),
    onSuccess: async (placed) => {
      // The bag is now the order: `create_order_from_cart` emptied it, so the
      // cached cart is stale the moment this resolves.
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });

      // Zero to pay means points or credit covered it and the order is already
      // settled. Opening a payment page for nothing would be a dead end.
      if (placed.payable.amountMinor > 0) await openExternal(placed.payUrl);

      router.replace(`/account/orders/${placed.orderId}`);
    },
  });

  if (status === 'loading') return <CheckoutSkeleton />;

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in to check out"
        body="Your bag and your saved addresses are kept with your account."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  if (cart.isPending || book.isPending) return <CheckoutSkeleton />;

  if (cart.isError) {
    return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />;
  }
  if (book.isError) {
    return <ErrorState error={book.error} onRetry={() => void book.refetch()} />;
  }

  if (cart.data.lines.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="There is nothing to check out."
        actionLabel="Browse the catalogue"
        onAction={() => router.push('/search')}
      />
    );
  }

  /*
   * `unavailable` blocks checkout here exactly as it does on the website. The
   * Bag says which lines and offers to remove them; repeating that here would
   * be a second place to keep the sentence right.
   */
  if (cart.data.unavailable > 0) {
    return (
      <EmptyState
        title="Some items are no longer available"
        body="Remove them from your bag and come back."
        actionLabel="Back to the bag"
        onAction={() => router.replace('/cart')}
      />
    );
  }

  if (book.data.unavailable) {
    return (
      <EmptyState
        title="Your addresses could not be read"
        body="Try again in a moment — your saved addresses have not gone anywhere."
        actionLabel="Try again"
        onAction={() => void book.refetch()}
      />
    );
  }

  if (book.data.addresses.length === 0) {
    return (
      <EmptyState
        title="Add a delivery address"
        body="A parcel needs somewhere to go. Your addresses are shared with the website."
        actionLabel="Add an address"
        onAction={() => router.push('/account/addresses')}
      />
    );
  }

  const chosen =
    book.data.addresses.find((address) => address.id === selectedId) ??
    book.data.addresses.find((address) => address.id === book.data.defaultId) ??
    book.data.addresses[0];

  const failure = order.isError ? describeError(order.error) : null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-4 pb-2">
        <Text step="h3">Deliver to</Text>

        {book.data.addresses.map((address) => (
          <AddressChoice
            key={address.id}
            address={address}
            selected={address.id === chosen?.id}
            onSelect={() => setSelectedId(address.id)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add another address"
          onPress={() => router.push('/account/addresses')}
          className="mt-1 p-2"
        >
          <Text step="small" tone="accent">
            Add another address
          </Text>
        </Pressable>

        <Text step="h3" className="mt-5">
          Offer code
        </Text>
        <Field
          label="Offer code"
          placeholder="Optional"
          autoCapitalize="characters"
          value={promotionCode}
          onChangeText={setPromotionCode}
        />
        <Text step="caption" tone="muted">
          Checked when the order is placed. What it takes off is worked out by HugFab, not
          here.
        </Text>

        {failure ? (
          <View className="bg-error-soft mt-4 rounded-md p-3">
            <Text step="small" tone="error" accessibilityLiveRegion="assertive">
              {failure.message}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="bg-surface border-t border-border p-4">
        <View className="flex-row items-center justify-between">
          <Text step="body" tone="muted">
            {`Subtotal · ${cart.data.itemCount} ${
              cart.data.itemCount === 1 ? 'item' : 'items'
            }`}
          </Text>
          <Text step="h3">{formatMoney(cart.data.subtotal)}</Text>
        </View>

        <Button
          label={order.isPending ? 'Placing your order…' : 'Place order'}
          pill
          fullWidth
          className="mt-3"
          disabled={order.isPending || chosen === undefined}
          onPress={() => {
            if (chosen !== undefined) order.mutate(chosen);
          }}
        />
        <Text step="caption" tone="muted" className="mt-2 text-center">
          Payment opens hugfab.com in a secure browser. Your order is saved before it
          does.
        </Text>
      </View>
    </View>
  );
}

function AddressChoice({
  address,
  selected,
  onSelect,
}: {
  address: SavedAddress;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Deliver to ${address.label}, ${formatAddress(address)}`}
      onPress={onSelect}
      style={elevation('sm')}
      className={`bg-surface mt-3 rounded-lg border p-3 ${
        selected ? 'border-primary' : 'border-border'
      }`}
    >
      <View className="flex-row items-center">
        <View
          className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? 'border-primary' : 'border-border'
          }`}
        >
          {selected ? <View className="bg-primary h-2.5 w-2.5 rounded-full" /> : null}
        </View>
        <Text step="small">{address.label}</Text>
      </View>
      <Text step="caption" tone="muted" className="mt-1.5">
        {formatAddress(address)}
      </Text>
    </Pressable>
  );
}

function CheckoutSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background p-4" accessibilityLabel="Loading checkout">
      <Skeleton className="mb-3 h-6 w-32 rounded-sm" />
      {[0, 1].map((index) => (
        <Skeleton key={index} className="mb-3 h-20 w-full rounded-lg" />
      ))}
    </View>
  );
}
