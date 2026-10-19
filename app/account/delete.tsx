/**
 * Closing an account.
 *
 * Apple's guideline 5.1.1(v) requires an app that creates accounts to let
 * somebody start deletion **inside the app**, and says pointing at an email
 * address or a support chat is not enough. This is that path. The website has
 * its own at `/account/delete`, which Google requires separately; both call the
 * same service, so there is one definition of what closing an account means.
 *
 * WHY THE WORD HAS TO BE TYPED
 * ----------------------------
 * The session already settled who this is, so a password prompt would be
 * defending against the wrong thing. What a confirmation defends against is a
 * misplaced tap on the most consequential row in the app, and a word typed out
 * is a better guard than a dialog that can be dismissed by reflex.
 *
 * There is no grace period and nothing is hidden behind "deactivate" — Apple
 * names deactivation as not deletion, and a shop that keeps an account for
 * thirty days after being asked to close it is doing something nobody asked
 * for.
 *
 * WHAT THIS SCREEN PROMISES
 * -------------------------
 * Only what the server actually does, which is the database's own rules: the
 * profile, addresses, wishlist, bag, reviews and balances go; orders and
 * payments are kept as financial records that stop naming anybody. Listing it
 * here rather than linking away matters — a person deciding this should not
 * have to leave the app to find out what happens.
 */

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { deleteAccount } from '@/api/account';
import { describeError } from '@/api/errors';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { SignInPrompt } from '@/components/states';
import { Text } from '@/components/text';
import { useAuth } from '@/auth/session';

const CONFIRM_WORD = 'DELETE';

const DELETED = [
  'Your profile and sign-in',
  'Your saved addresses, wishlist and bag',
  'Your saved searches and notification preferences',
  'Your reviews and community posts',
  'Your points and wallet balance',
];

export default function DeleteAccountScreen(): React.JSX.Element {
  const { status, signOut } = useAuth();
  const router = useRouter();
  const [typed, setTyped] = useState('');

  const close = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      /*
       * The account is gone, and with it every session it had — the server
       * deleted the auth user. Signing out locally is housekeeping: it clears
       * the token this device is still holding so no screen tries to use it.
       */
      await signOut();
      router.replace('/');
    },
  });

  if (status === 'signedOut') {
    return (
      <SignInPrompt
        title="Sign in first"
        body="We can only close an account you are signed in to."
        onSignIn={() => router.push('/auth/login')}
      />
    );
  }

  const failure = close.isError ? describeError(close.error) : null;
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4">
      <Text step="h2">Close your account</Text>
      <Text step="small" tone="muted" className="mt-2">
        This cannot be undone. It happens immediately — there is no waiting period and no
        way to reopen it.
      </Text>

      <Text step="h3" className="mt-6">
        What is deleted
      </Text>
      {DELETED.map((item) => (
        <Text key={item} step="small" tone="muted" className="mt-1">
          {`•  ${item}`}
        </Text>
      ))}

      <Text step="h3" className="mt-6">
        What is kept
      </Text>
      <Text step="small" tone="muted" className="mt-1">
        Orders and payments stay as financial records, which HugFab has to keep — but they
        stop naming you. The same is true of the click records behind affiliate links.
      </Text>

      <View className="mt-6">
        <Field
          label={`Type ${CONFIRM_WORD} to confirm`}
          autoCapitalize="characters"
          autoCorrect={false}
          value={typed}
          onChangeText={setTyped}
        />
      </View>

      {failure ? (
        <View className="bg-error-soft mt-2 rounded-md p-3">
          <Text step="small" tone="error" accessibilityLiveRegion="assertive">
            {failure.message}
          </Text>
        </View>
      ) : null}

      <Button
        label={close.isPending ? 'Closing your account…' : 'Close my account'}
        variant="danger"
        pill
        fullWidth
        className="mt-4"
        disabled={!confirmed || close.isPending}
        onPress={() => close.mutate()}
      />

      <Button
        label="Keep my account"
        variant="outline"
        pill
        fullWidth
        className="mt-3"
        disabled={close.isPending}
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}
