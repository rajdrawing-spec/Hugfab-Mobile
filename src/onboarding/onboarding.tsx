/**
 * The intro, per the brief §5: four swipeable screens, Get Started, Skip.
 *
 * Each slide states one thing HugFab does — discovery, comparison, deals, the
 * stylist — because that is the product's actual argument and it is not obvious
 * from a catalogue screen. The slides are honest about features that exist: all
 * four are things the app does today.
 *
 * **Nobody is asked to sign in.** The brief is explicit, and it is right: the
 * catalogue browses signed out, so a sign-in wall here would cost users at the
 * one moment they have no reason to trust us yet. Finishing drops you into Home.
 *
 * Swiping is a paging `ScrollView` rather than a gesture library — the brief
 * wants swipeable slides, not a draggable card deck, and every gesture package
 * worth using brings a native module Expo Go does not carry.
 *
 * The art slot is the same story as the splash: there is no HugFab photography
 * in this repo, so each slide draws a tinted panel with its icon. Give a slide an
 * `art` and it renders the image instead, with nothing else changing.
 */

import { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Touchable } from '@/components/pressable';
import { color } from '@/theme';

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  art?: ImageSourcePropType;
}

const SLIDES: readonly Slide[] = [
  {
    key: 'discover',
    icon: 'sparkles-outline',
    title: 'Discover your style',
    body: 'Explore trending fashion, new arrivals and pieces picked for what you actually wear.',
  },
  {
    key: 'compare',
    icon: 'swap-horizontal-outline',
    title: 'Compare prices',
    body: 'The same product across retailers, side by side, with the cheapest one stated rather than implied.',
  },
  {
    key: 'deals',
    icon: 'pricetag-outline',
    title: 'Shop smarter',
    body: 'Save what you love and watch its price. We show the reduction the retailer actually published.',
  },
  {
    key: 'stylist',
    icon: 'chatbubble-ellipses-outline',
    title: 'Your personal AI stylist',
    body: 'Tell it the occasion, the budget and the look. It searches the catalogue and shows you what fits.',
  },
];

export function Onboarding({ onDone }: { onDone: () => void }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;

  /**
   * A manual swipe settling. Reconciles the dots and the button with where the
   * slide actually landed.
   */
  const onSettled = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  /**
   * The button moves the index itself rather than waiting to be told by a scroll
   * event.
   *
   * It used to do the latter, and that was a trap: a programmatic
   * `scrollTo` does not reliably emit a momentum-end on every platform, so on one
   * where it does not the index never advanced — the label stayed "Next" and
   * "Get started" never appeared, leaving no way out of the intro at all. The
   * button is the authority for button presses; the scroll handler is the
   * authority for swipes.
   */
  const advance = (): void => {
    if (last) {
      onDone();
      return;
    }
    const next = index + 1;
    setIndex(next);
    scroller.current?.scrollTo({ x: width * next, animated: true });
  };

  return (
    <View className="bg-surface flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-end px-2 py-1">
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Skip the introduction"
          onPress={onDone}
          className="px-3 py-2"
        >
          <Text step="small" tone="muted" weight="medium">
            Skip
          </Text>
        </Touchable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettled}
        // `scrollEventThrottle` with `onScroll` would update the dots mid-drag;
        // momentum-end is what matches where the slide actually settles.
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={{ width }} className="items-center px-8 pt-4">
            <View className="bg-primary-soft h-56 w-full items-center justify-center overflow-hidden rounded-xl">
              {slide.art ? (
                <Image
                  source={slide.art}
                  resizeMode="cover"
                  className="h-full w-full"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Ionicons name={slide.icon} size={64} color={color('primary')} />
              )}
            </View>

            <Text step="h2" className="mt-10 text-center">
              {slide.title}
            </Text>
            <Text step="body" tone="muted" className="mt-3 text-center">
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-8" style={{ paddingBottom: insets.bottom + 24 }}>
        <View
          className="mb-6 flex-row justify-center"
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${String(index + 1)} of ${String(SLIDES.length)}`}
        >
          {SLIDES.map((slide, dot) => (
            <View
              key={slide.key}
              className={`mx-1 h-2 rounded-full ${
                dot === index ? 'bg-primary w-6' : 'bg-border w-2'
              }`}
            />
          ))}
        </View>

        <Button label={last ? 'Get started' : 'Next'} pill fullWidth onPress={advance} />

        <Text step="caption" tone="muted" className="mt-4 text-center">
          No account needed to look around.
        </Text>
      </View>
    </View>
  );
}
