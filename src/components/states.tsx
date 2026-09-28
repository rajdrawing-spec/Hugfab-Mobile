/**
 * The three states every list in this app has, built together so none is an
 * afterthought.
 *
 * `docs/design-system.md` asks for skeletons rather than spinners, and the reason
 * is not decoration: a skeleton in the shape of the content tells someone what is
 * coming and how much, and it makes a slow connection feel like loading instead of
 * like nothing happening.
 */

import { useEffect, useState } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './text';
import { Button } from './button';
import { describeError, FeatureUnavailableError } from '@/api/errors';
import { openWebPage } from '@/lib/links';

/**
 * A pulsing block. One shared animation driver per instance is fine — these are
 * short-lived and few; `useNativeDriver` keeps the pulse off the JS thread so it
 * does not stutter while the response is being parsed.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  /** For a dimension only the render knows, such as a gallery sized to the screen. */
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  // Lazy `useState` rather than `useRef(new Animated.Value(...))`: the ref form
  // constructs a throwaway Value on every render, and reading `.current` during
  // render is what the React lint rules now forbid.
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[style, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={['bg-surface-2 rounded-md', className ?? ''].join(' ')}
    />
  );
}

/** A product card's shape, for a grid that has not arrived. */
export function ProductCardSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 p-2">
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-1.5 h-4 w-4/5" />
      <Skeleton className="mt-1.5 h-4 w-1/3" />
    </View>
  );
}

export function ProductGridSkeleton({
  count = 6,
}: {
  count?: number;
}): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap px-2" accessibilityLabel="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="w-1/2">
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/**
 * Nothing to show, and it is not a failure.
 *
 * `action` is what to do about it. An empty state without one is a dead end, which
 * is the most common way a good screen wastes someone's time.
 */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <View className="items-center px-8 py-16">
      <Text step="h3" className="text-center">
        {title}
      </Text>
      <Text step="small" tone="muted" className="mt-2 text-center">
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} pill className="mt-6" />
      ) : null}
    </View>
  );
}

/**
 * Something failed, said in the API's own words.
 *
 * `docs/api.md` states that `message` is safe to show a user, and those messages
 * are specific — "that size is no longer held" beats "Something went wrong", so
 * this does not paraphrase them.
 *
 * Retry is offered only where trying again could work. A 409 or a 422 was
 * understood and refused, and a button that cannot help teaches someone that
 * buttons do not help.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}): React.JSX.Element {
  const { message, retryable } = describeError(error);
  const webPath = error instanceof FeatureUnavailableError ? error.webPath : null;

  return (
    <View className="items-center px-8 py-16" accessibilityLiveRegion="polite">
      <Text step="h3" className="text-center">
        {webPath ? 'Not in the app yet' : 'That did not work'}
      </Text>
      <Text step="small" tone="muted" className="mt-2 text-center">
        {message}
      </Text>
      {webPath ? (
        <Button
          label="Open on the website"
          variant="outline"
          pill
          className="mt-6"
          onPress={() => void openWebPage(webPath)}
        />
      ) : retryable && onRetry ? (
        <Button
          label="Try again"
          variant="outline"
          pill
          className="mt-6"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

/**
 * A row of copy for a screen that needs a signed-in person and does not have one.
 * Separate from `EmptyState` because the answer is a specific one — sign in — and
 * because it must never be reached by a failed request being mistaken for an
 * empty one.
 */
export function SignInPrompt({
  title,
  body,
  onSignIn,
}: {
  title: string;
  body: string;
  onSignIn: () => void;
}): React.JSX.Element {
  return (
    <EmptyState title={title} body={body} actionLabel="Sign in" onAction={onSignIn} />
  );
}
