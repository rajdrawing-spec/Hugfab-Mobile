/**
 * Asking for a password reset link.
 *
 * Until now the app had no way back from a forgotten password: sign-in showed
 * Supabase's "Invalid login credentials" and that was the end of the road, on
 * the one surface where a shopper is most likely to be stuck.
 *
 * **One answer for every outcome.** This screen shows "check your email"
 * whether the address is registered, unregistered, rate-limited or the network
 * is down. That is not laziness — `src/auth/password-reset.ts` explains it, and
 * so does the web app's own form: a screen that says "no account with that
 * email" lets anyone walk a list of addresses through it and learn who shops
 * here. There is deliberately no error state on this screen, and adding one
 * would reintroduce the leak.
 *
 * **The link opens the website.** Said plainly rather than implied, because the
 * alternative is somebody tapping a link on their phone, landing in a browser,
 * and wondering whether it worked. In Expo Go a deep link back into the app
 * would carry the dev machine's address, so a link minted here would be dead on
 * the device that reads the email — Phase 2, behind `eas build`.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { useAuth } from '@/auth/session';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const { requestPasswordReset, available } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(): Promise<void> {
    setBusy(true);
    // No try/catch: `requestPasswordReset` does not reject. One answer.
    await requestPasswordReset(email);
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text step="h2">Check your email</Text>
        <Text step="body" tone="muted" className="mt-4">
          If an account exists for {email.trim()}, a link to set a new password is on its
          way. It expires in an hour and can be used once.
        </Text>
        <Text step="small" tone="muted" className="mt-4">
          The link opens hugfab.com in your browser, where you can choose the new
          password. Then come back here and sign in with it.
        </Text>
        <Text step="small" tone="muted" className="mt-4">
          Nothing arrived? Check spam, and make sure the address is the one you signed up
          with.
        </Text>
        <Button
          label="Back to sign in"
          pill
          fullWidth
          className="mt-8"
          onPress={() => router.replace('/auth/login')}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
        <Text step="h2">Forgotten your password?</Text>
        <Text step="small" tone="muted" className="mb-6 mt-1">
          Enter the email you signed up with and we will send a link to set a new one.
        </Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCorrect={false}
          onSubmitEditing={() => void onSubmit()}
          returnKeyType="send"
        />

        <Button
          label="Send the link"
          pill
          fullWidth
          loading={busy}
          disabled={email.trim().length === 0 || busy || !available}
          onPress={() => void onSubmit()}
        />

        <View className="mt-6 flex-row justify-center">
          <Link href="/auth/login" replace>
            <Text step="small" tone="primary" weight="semibold">
              Back to sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
