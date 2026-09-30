/**
 * A retailer, with their logo and their name.
 *
 * `docs/ui-ux-guide.md` §4 is specific: **never a bare domain**, and §6 adds that
 * retailer names and logos are theirs, shown per feed terms and never restyled to
 * look like HugFab UI. So the logo is drawn as supplied, uncropped and untinted,
 * on a neutral tile.
 *
 * `logoUrl` is null for most retailers — the guide's own note is that feeds name a
 * retailer long before they supply artwork — so the fallback is a monogram, not a
 * placeholder image and not a guessed favicon URL.
 */

import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './text';
import type { RetailerSummary } from '@/api/types';

export function RetailerBadge({
  retailer,
  size = 'sm',
}: {
  retailer: RetailerSummary;
  size?: 'sm' | 'md';
}): React.JSX.Element {
  const box = size === 'md' ? 'h-9 w-9' : 'h-6 w-6';

  return (
    <View className="flex-row items-center">
      <View
        className={`${box} bg-surface-2 items-center justify-center overflow-hidden rounded-sm`}
      >
        {retailer.logoUrl ? (
          <Image
            source={retailer.logoUrl}
            contentFit="contain"
            transition={100}
            className="h-full w-full"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text step="caption" weight="semibold" tone="muted">
            {retailer.name.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <Text
        step={size === 'md' ? 'small' : 'caption'}
        tone="muted"
        numberOfLines={1}
        className="ml-2 flex-1"
      >
        {retailer.name}
      </Text>
    </View>
  );
}
