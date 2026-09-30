/**
 * The brand moment, per the brief §4: wordmark, tagline, a progress indicator,
 * and a fashion image behind it treated softly.
 *
 * **There is no fashion image in this repo.** `assets/` holds the Expo template's
 * generic icons and nothing of HugFab's — not the logo lockup, not photography.
 * So the backdrop is the brand gradient, and `art` is a real slot: drop a
 * `require('../../assets/splash-art.jpg')` in and it renders behind the scrim
 * with the wordmark unchanged. Shipping a stock photograph pulled from nowhere
 * would put art in front of users that nobody at HugFab chose.
 *
 * The wordmark is set in Poppins rather than drawn. `docs/design-system.md` is
 * clear that the lockup is `public/hugfab-logo.png` used exactly as supplied and
 * never reconstructed in code — so until that file is in this repo, type is the
 * honest stand-in and a hand-built bear would not be.
 *
 * On timing: this screen is shown for a minimum beat (`MIN_VISIBLE_MS`) even when
 * the work behind it finishes sooner. That is a deliberate brand beat, not a fake
 * loader — reading one AsyncStorage key takes a few milliseconds, and a splash
 * that flashes for 20ms is worse than none. Set it to 0 to remove the beat
 * entirely; nothing else depends on it.
 */

import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './text';
import { promoGradient } from '@/theme';

/**
 * The brand beat. See the note above before changing it.
 *
 * Typed `number` rather than left as a literal, so the launch gate's `=== 0`
 * check is a runtime question and not a type error the compiler answers for us.
 */
export const MIN_VISIBLE_MS: number = 900;

export function Splash({ art }: { art?: ImageSourcePropType }): React.JSX.Element {
  const [fade] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(12));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Indeterminate: it reports that work is happening, not how much is left.
    // A bar that claims a percentage it cannot know is a lie with a shape.
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, rise, progress]);

  return (
    <View className="flex-1 items-center justify-center">
      <LinearGradient
        colors={[...promoGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {art ? (
        <>
          <Image
            source={art}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
          {/* The scrim is what keeps the wordmark legible over any photograph,
              which is the "very subtle treatment" the brief asks for. */}
          <View className="bg-scrim" style={StyleSheet.absoluteFill} />
        </>
      ) : null}

      <Animated.View
        style={{ opacity: fade, transform: [{ translateY: rise }] }}
        className="items-center px-8"
      >
        <Text step="h1" tone="primary-foreground" weight="bold">
          HUGFAB
        </Text>
        <Text
          step="small"
          tone="primary-foreground"
          className="mt-2 text-center opacity-90"
        >
          Your style. Every store. One place.
        </Text>
      </Animated.View>

      <View className="absolute bottom-16 h-1 w-40 overflow-hidden rounded-full bg-primary-foreground/25">
        <Animated.View
          className="bg-primary-foreground h-full w-1/3 rounded-full"
          style={{
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  // From fully off the left to fully off the right of a 160px bar.
                  outputRange: [-54, 160],
                }),
              },
            ],
          }}
        />
      </View>
    </View>
  );
}
