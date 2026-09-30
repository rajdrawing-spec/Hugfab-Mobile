/**
 * A Pressable that responds to being pressed.
 *
 * React Native's default gives you nothing: a card you tap looks identical
 * mid-tap, which on a slow connection reads as the tap having missed. The fix is
 * a scale of a few percent and a light haptic — small enough that nobody
 * notices it, conspicuous by its absence, and most of the difference between an
 * interface that feels built and one that feels sketched.
 *
 * Driven by `Animated` with `useNativeDriver`, so the press stays smooth while
 * the JS thread is busy parsing the response the press asked for.
 *
 * Haptics are opt-out per instance and skipped entirely on a non-tappable. They
 * fire on press-in, not on press-out: the feedback is for "I registered that",
 * and feedback that waits for the finger to lift is too late to mean it.
 */

import { useCallback, useState } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface TouchableProps extends Omit<PressableProps, 'style'> {
  /** How far to shrink. 'card' is subtler than 'control' because it moves more pixels. */
  press?: 'card' | 'control' | 'none';
  haptic?: boolean;
  className?: string;
  /**
   * Layout classes for the **animating wrapper**, not the pressable surface.
   *
   * `className` lands on the Pressable, so its padding is part of the touch
   * target — which is what a card wants. But that leaves the wrapper
   * shrink-wrapped, so a `flex-1` passed as `className` inside a flex row sizes
   * the Pressable within a wrapper that never grew, and the row collapses. Any
   * class that decides how much space this occupies belongs here.
   */
  containerClassName?: string;
  /**
   * For what a class name cannot express — chiefly `elevation()`, which has to
   * be a style object because Android's `elevation` and iOS's four `shadow*`
   * props have no single class.
   */
  style?: StyleProp<ViewStyle>;
}

const SCALE = { card: 0.98, control: 0.96, none: 1 } as const;

export function Touchable({
  press = 'control',
  haptic = true,
  onPressIn,
  onPressOut,
  disabled,
  children,
  style,
  containerClassName,
  ...rest
}: TouchableProps): React.JSX.Element {
  // Lazy `useState`, not `useRef(...).current` — the ref form builds a throwaway
  // Value every render, and reading `.current` during render is what the React
  // lint rules forbid.
  const [scale] = useState(() => new Animated.Value(1));

  const animate = useCallback(
    (to: number) => {
      Animated.spring(scale, {
        toValue: to,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    },
    [scale],
  );

  return (
    // The shadow goes on the animating wrapper, not the Pressable: Android draws
    // `elevation` from the view's own background, and a transparent Pressable
    // inside a scaled parent casts nothing.
    <Animated.View
      className={containerClassName}
      style={[style, { transform: [{ scale }] }]}
    >
      <Pressable
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled && press !== 'none') animate(SCALE[press]);
          if (!disabled && haptic) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          onPressOut?.(event);
        }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
