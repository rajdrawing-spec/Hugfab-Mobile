/**
 * The address book: the saved addresses an order can go to.
 *
 * This screen replaces a link to the website. The routes behind it
 * (`/api/account/addresses` and friends) shipped on HUGFAB-AI `main` on
 * 6 October and their own comments say they are "the address book over HTTP,
 * for the mobile app", so the Account tab's note that addresses "are not in the
 * app yet" is no longer true.
 *
 * Three decisions worth stating, because each is a thing the app could have got
 * wrong cheaply:
 *
 * **`unavailable` is not "you have no addresses".** The API carries a flag for
 * "the book could not be read" precisely so a client cannot conflate the two,
 * and it is the one case here that gets its own banner rather than the empty
 * state. Telling somebody their saved addresses are gone when the database
 * merely hiccuped is the failure this guards.
 *
 * **Nothing is validated here.** No PIN regex, no mobile-number check, no
 * "required" logic beyond leaving Save enabled. The web app validates with the
 * same schema checkout uses, so an address that saves is an address an order
 * accepts — and a second copy of those rules on the phone would be a second
 * definition that drifts. The form sends what was typed and renders the field
 * errors that come back.
 *
 * **Every write replaces the book from its own response.** The server returns
 * the whole reordered list, with `isDefault` already settled by rules this app
 * must not reimplement: the first address saved becomes the default, and
 * deleting the default promotes the next one. Patching a row locally would mean
 * re-deriving those, so the response is written straight into the cache.
 */

import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { BottomSheet } from '@/components/bottom-sheet';
import { Chip } from '@/components/chip';
import { Field } from '@/components/field';
import { Touchable } from '@/components/pressable';
import { EmptyState, ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import {
  createAddress,
  getAddressBook,
  makeDefaultAddress,
  removeAddress,
  updateAddress,
} from '@/api/addresses';
import { ApiError, describeError } from '@/api/errors';
import { ADDRESS_KINDS, formatAddress, formatPhone } from '@/lib/address';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';
import { color } from '@/theme';
import type { AddressBook, AddressInput, AddressKind, SavedAddress } from '@/api/types';

/** An empty form. `line2` is `''` and not absent — see `AddressInput`. */
const BLANK: AddressInput = {
  label: '',
  kind: 'home',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

export default function AddressesScreen(): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  /** The address being edited, or `'new'`, or nothing — the sheet's state. */
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);

  const book = useQuery({
    queryKey: queryKeys.addresses(),
    queryFn: ({ signal }) => getAddressBook(signal),
    enabled: status === 'signedIn',
  });

  /**
   * Write the book a mutation returned into the cache. The response is already
   * the whole list in the server's order, so this is a replacement rather than a
   * merge — and it avoids a refetch the response has already answered.
   */
  function putBook(addresses: SavedAddress[]): void {
    queryClient.setQueryData<AddressBook>(queryKeys.addresses(), (previous) => ({
      addresses,
      defaultId: addresses.find((a) => a.isDefault)?.id ?? null,
      unavailable: previous?.unavailable ?? false,
    }));
  }

  const setDefault = useMutation({
    mutationFn: (id: string) => makeDefaultAddress(id),
    onSuccess: (result) => putBook(result.addresses),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeAddress(id),
    onSuccess: (result) => putBook(result.addresses),
  });

  if (status === 'loading') {
    return (
      <Shell>
        <View className="p-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="mt-3 h-28 w-full rounded-lg" />
        </View>
      </Shell>
    );
  }

  if (status === 'signedOut') {
    return (
      <Shell>
        <SignInPrompt
          title="Sign in to see your addresses"
          body="Your address book is kept with your account, on the app and on the website."
          onSignIn={() => router.push('/auth/login')}
        />
      </Shell>
    );
  }

  if (book.isPending) {
    return (
      <Shell>
        <View className="p-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="mt-3 h-28 w-full rounded-lg" />
        </View>
      </Shell>
    );
  }

  if (book.isError) {
    return (
      <Shell>
        <ErrorState error={book.error} onRetry={() => void book.refetch()} />
      </Shell>
    );
  }

  const { addresses, unavailable } = book.data;

  return (
    <Shell>
      <ScrollView contentContainerClassName="pb-28">
        {/*
          The distinction the API went out of its way to carry. A book that could
          not be read is not an empty book, so this is a failure notice above
          whatever is — or is not — in the list, never the empty state.
        */}
        {unavailable ? (
          <View className="bg-error-soft m-4 rounded-lg p-3">
            <Text step="small" tone="error" accessibilityLiveRegion="polite">
              Your saved addresses could not be loaded just now. They have not been lost —
              try again in a moment.
            </Text>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              pill
              className="mt-3 self-start"
              onPress={() => void book.refetch()}
            />
          </View>
        ) : null}

        {addresses.length === 0 && !unavailable ? (
          <EmptyState
            title="No saved addresses"
            body="Save an address and it will be offered at checkout, on the app and on the website."
            actionLabel="Add an address"
            onAction={() => setEditing('new')}
          />
        ) : (
          <View className="p-4">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                busy={
                  (setDefault.isPending && setDefault.variables === address.id) ||
                  (remove.isPending && remove.variables === address.id)
                }
                onEdit={() => setEditing(address)}
                onMakeDefault={() => setDefault.mutate(address.id)}
                onRemove={() => confirmRemove(address, () => remove.mutate(address.id))}
              />
            ))}
          </View>
        )}

        {/*
          A write that failed says so here. It is deliberately not a field error:
          "that address is no longer in your book" belongs to the row, not to a
          form, and there is no input that would have made it work.
        */}
        {setDefault.isError || remove.isError ? (
          <View className="bg-error-soft mx-4 mb-4 rounded-lg p-3">
            <Text step="small" tone="error" accessibilityLiveRegion="assertive">
              {describeError(setDefault.error ?? remove.error).message}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {addresses.length > 0 || unavailable ? (
        <View className="border-t border-border bg-surface p-4">
          <Button
            label="Add an address"
            pill
            fullWidth
            onPress={() => setEditing('new')}
          />
        </View>
      ) : null}

      {editing ? (
        <AddressForm
          /* A fresh form per target, so an edit never shows the last one's text. */
          key={editing === 'new' ? 'new' : editing.id}
          address={editing === 'new' ? null : editing}
          hasOthers={addresses.length > 0}
          onClose={() => setEditing(null)}
          onSaved={(addresses) => {
            putBook(addresses);
            setEditing(null);
          }}
        />
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Addresses" />
      {children}
    </View>
  );
}

/**
 * Deleting is destructive and not undoable, so it asks first. The default
 * address is worth naming in the question: losing it silently reassigns which
 * address an order goes to, and that is the kind of surprise that ends up on a
 * doorstep somebody has moved out of.
 */
function confirmRemove(address: SavedAddress, onConfirm: () => void): void {
  Alert.alert(
    `Delete ${address.label}?`,
    address.isDefault
      ? 'This is your default address. Another one will become the default.'
      : 'This cannot be undone.',
    [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}

function AddressCard({
  address,
  busy,
  onEdit,
  onMakeDefault,
  onRemove,
}: {
  address: SavedAddress;
  busy: boolean;
  onEdit: () => void;
  onMakeDefault: () => void;
  onRemove: () => void;
}): React.JSX.Element {
  const kind = ADDRESS_KINDS.find((k) => k.value === address.kind);

  return (
    <View className="bg-surface mb-3 rounded-lg border border-border p-4">
      <View className="flex-row items-center">
        <Text step="small" weight="semibold" className="flex-1">
          {address.label}
        </Text>
        {address.isDefault ? <Badge label="Default" /> : null}
      </View>

      {kind && kind.label.toLowerCase() !== address.label.toLowerCase() ? (
        <Text step="caption" tone="muted" className="mt-0.5">
          {kind.label}
        </Text>
      ) : null}

      <Text step="small" className="mt-2">
        {address.name}
      </Text>
      <Text step="small" tone="muted" className="mt-0.5">
        {formatAddress(address)}
      </Text>
      <Text step="small" tone="muted" className="mt-0.5">
        {formatPhone(address.phone)}
      </Text>

      <View className="mt-3 flex-row items-center">
        <Button label="Edit" variant="outline" size="sm" pill onPress={onEdit} />
        {address.isDefault ? null : (
          <Button
            label="Make default"
            variant="text"
            size="sm"
            className="ml-2"
            loading={busy}
            onPress={onMakeDefault}
          />
        )}
        <View className="flex-1" />
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${address.label}`}
          onPress={onRemove}
          className="shrink-0 py-1 pl-3 pr-1"
        >
          <Ionicons name="trash-outline" size={19} color={color('error')} />
        </Touchable>
      </View>
    </View>
  );
}

/**
 * The add/edit form.
 *
 * One component for both, because there is one service call behind POST and
 * PATCH — the route does `saveAddress({ ...body, id })` — so a separate "create"
 * form would be a second shape of the same request.
 */
function AddressForm({
  address,
  hasOthers,
  onClose,
  onSaved,
}: {
  address: SavedAddress | null;
  hasOthers: boolean;
  onClose: () => void;
  onSaved: (addresses: SavedAddress[]) => void;
}): React.JSX.Element {
  const [form, setForm] = useState<AddressInput>(() =>
    address
      ? {
          label: address.label,
          kind: address.kind,
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        }
      : BLANK,
  );

  const save = useMutation({
    mutationFn: (input: AddressInput) =>
      address ? updateAddress(address.id, input) : createAddress(input),
    onSuccess: (result) => onSaved(result.addresses),
  });

  /*
   * Per-field messages from a BAD_REQUEST, which is where the server puts a
   * rejected PIN code or mobile number. One sentence per field — see the note on
   * `ApiError.fieldErrors`, which used to have this typed as an array.
   */
  const fields = save.error instanceof ApiError ? save.error.fieldErrors : null;

  /** The summary line: the API's own sentence, unless it is only field errors. */
  const summary = save.isError && !fields ? describeError(save.error).message : null;

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <BottomSheet
      visible
      title={address ? 'Edit address' : 'Add an address'}
      onClose={onClose}
      footer={
        <Button
          label={address ? 'Save changes' : 'Save address'}
          pill
          fullWidth
          loading={save.isPending}
          onPress={() => save.mutate(form)}
        />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="p-4">
          {summary ? (
            <View className="bg-error-soft mb-4 rounded-md p-3">
              <Text step="small" tone="error" accessibilityLiveRegion="assertive">
                {summary}
              </Text>
            </View>
          ) : null}

          <Field
            label="Name this address"
            value={form.label}
            onChangeText={(value) => set('label', value)}
            error={fields?.label}
            hint="Home, Work, Mum's — up to 24 characters"
            maxLength={24}
          />

          <Text step="small" weight="medium">
            Kind
          </Text>
          <View className="mb-4 mt-1.5 flex-row">
            {ADDRESS_KINDS.map((kind) => (
              <Chip
                key={kind.value}
                label={kind.label}
                selected={form.kind === kind.value}
                onPress={() => set('kind', kind.value satisfies AddressKind)}
              />
            ))}
          </View>

          <Field
            label="Full name"
            value={form.name}
            onChangeText={(value) => set('name', value)}
            error={fields?.name}
            autoComplete="name"
            textContentType="name"
          />
          <Field
            label="Mobile number"
            value={form.phone}
            onChangeText={(value) => set('phone', value)}
            error={fields?.phone}
            hint="The courier rings this number"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <Field
            label="House or flat, building, street"
            value={form.line1}
            onChangeText={(value) => set('line1', value)}
            error={fields?.line1}
            autoComplete="street-address"
            multiline
          />
          <Field
            label="Area, landmark (optional)"
            value={form.line2}
            onChangeText={(value) => set('line2', value)}
            error={fields?.line2}
          />
          <Field
            label="Town or city"
            value={form.city}
            onChangeText={(value) => set('city', value)}
            error={fields?.city}
            autoComplete="postal-address-locality"
          />
          <Field
            label="State"
            value={form.state}
            onChangeText={(value) => set('state', value)}
            error={fields?.state}
            autoComplete="postal-address-region"
          />
          <Field
            label="PIN code"
            value={form.postalCode}
            onChangeText={(value) => set('postalCode', value)}
            error={fields?.postalCode}
            keyboardType="number-pad"
            autoComplete="postal-code"
            maxLength={6}
          />

          {/*
            Offered only when there is something to be default instead of. The
            first address saved becomes the default server-side — the service
            says so — and a switch whose only possible answer is "yes" is a
            switch that teaches someone the controls are decorative.
          */}
          {hasOthers && !address?.isDefault ? (
            <Touchable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.makeDefault === true }}
              accessibilityLabel="Make this my default address"
              onPress={() => set('makeDefault', !(form.makeDefault ?? false))}
              className="flex-row items-center py-2"
            >
              <Ionicons
                name={form.makeDefault === true ? 'checkbox' : 'square-outline'}
                size={21}
                color={form.makeDefault === true ? color('primary') : color('muted')}
              />
              <Text step="small" className="ml-2.5">
                Make this my default address
              </Text>
            </Touchable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
