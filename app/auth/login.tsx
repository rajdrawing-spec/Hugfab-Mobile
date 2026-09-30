/**
 * Sign in with email and password.
 *
 * Google is deliberately absent. In Expo Go it means an `exp://` redirect through
 * a browser that breaks as soon as the scheme changes, so it belongs to the first
 * dev build — `docs/PLAN.md` Phase 2. Offering a button that works on one
 * developer's machine and not on a tester's would be worse than not offering it.
 *
 * Supabase's own error messages are shown as they come. "Invalid login credentials"
 * is deliberately vague on their side — it does not say whether the address exists —
 * and rewording it is how an app accidentally confirms which emails are registered.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { useAuth } from '@/auth/session';

export default function LoginScreen(): React.JSX.Element {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function onSubmit(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      // `onAuthStateChange` has already updated the session by here, so going back
      // lands on a screen that knows who you are.
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
        <Text step="h2">Sign in</Text>
        <Text step="small" tone="muted" className="mb-6 mt-1">
          The same account as the HugFab website.
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
          autoComplete="current-password"
          textContentType="password"
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
          label="Sign in"
          pill
          fullWidth
          loading={busy}
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
        />

        <View className="mt-6 flex-row justify-center">
          <Text step="small" tone="muted">
            New to HugFab?{' '}
          </Text>
          <Link href="/auth/signup" replace>
            <Text step="small" tone="primary" weight="semibold">
              Create an account
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
