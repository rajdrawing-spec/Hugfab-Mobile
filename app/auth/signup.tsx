/**
 * Create an account.
 *
 * Supabase returns a user with no session when email confirmation is on, so
 * `needsEmailConfirmation` decides between "you are in" and "check your email". A
 * screen that navigated into the app on either would leave someone signed out and
 * wondering why nothing saved.
 *
 * The password minimum is checked here as well as by Supabase, only so the failure
 * arrives before a round trip. Supabase remains the authority — a project can raise
 * its own minimum and this must not claim otherwise, which is why the message says
 * what this app requires rather than what the project does.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { useAuth } from '@/auth/session';

const MIN_PASSWORD = 8;

export default function SignupScreen(): React.JSX.Element {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit = email.trim().length > 0 && password.length >= MIN_PASSWORD && !busy;

  async function onSubmit(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password);
      if (needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        router.back();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  if (confirmationSent) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text step="h2">Check your email</Text>
        <Text step="body" tone="muted" className="mt-2">
          {`We sent a confirmation link to ${email.trim()}. Open it, then come back and sign in.`}
        </Text>
        <Button
          label="Back to sign in"
          pill
          fullWidth
          className="mt-6"
          onPress={() => router.replace('/auth/login')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
        <Text step="h2">Create an account</Text>
        <Text step="small" tone="muted" className="mb-6 mt-1">
          One account for the app and the website.
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
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={tooShort ? `At least ${MIN_PASSWORD} characters.` : null}
          hint={`At least ${MIN_PASSWORD} characters.`}
          onSubmitEditing={() => void onSubmit()}
          returnKeyType="go"
        />

        {error ? (
          <View className="bg-error-soft mb-4 rounded-md p-3">
            <Text step="small" tone="error" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          </View>
        ) : null}

        <Button
          label="Create account"
          pill
          fullWidth
          loading={busy}
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
        />

        <View className="mt-6 flex-row justify-center">
          <Text step="small" tone="muted">
            Already have an account?{' '}
          </Text>
          <Link href="/auth/login" replace>
            <Text step="small" tone="primary" weight="semibold">
              Sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
