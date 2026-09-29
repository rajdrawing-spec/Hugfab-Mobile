/**
 * Home's header: the brand ribbon, the wordmark, and the search bar.
 *
 * The gradient is the web app's own `promo-from` → `promo-to`, and its comment in
 * `tokens.css` explains the two stops — a flat band of brand colour across a full
 * width reads as an error state; a gradient reads as a ribbon. Same reasoning
 * applies on a phone, where the band is the whole width of the screen.
 *
 * The search bar sits half-out of the ribbon, overlapping the content below it.
 * That is what §1 asks for — *search is the front door* — without spending a
 * whole band of screen on a control nobody has tapped yet.
 *
 * The gradient is painted **behind** a plain View rather than being given the
 * layout classes itself. NativeWind maps `className` onto React Native's own
 * components; a third-party one like `LinearGradient` silently ignores it unless
 * it is registered, so the padding was dropped and the search bar sat on top of
 * the tagline. A wrapper that owns the layout cannot fail that way.
 */

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from './text';
import { SearchBar } from './search-bar';
import { promoGradient } from '@/theme';

export function HomeHeader(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="mb-2">
      <View
        className="overflow-hidden rounded-b-xl px-4 pb-16"
        style={{ paddingTop: insets.top + 16 }}
      >
        <LinearGradient
          colors={[...promoGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The wordmark is set, not drawn: public/hugfab-logo.png is the lockup
            and is not reconstructed in code (docs/design-system.md). Until that
            asset is in this repo, the name is set in the brand face rather than
            approximated with a bear. */}
        <Text step="h2" tone="primary-foreground" weight="bold">
          HugFab
        </Text>
        <Text step="small" tone="primary-foreground" className="mt-1 opacity-90">
          Every store, one place.
        </Text>
      </View>

      <View className="-mt-7 px-4">
        <SearchBar onPress={() => router.push('/search')} />
      </View>
    </View>
  );
}
