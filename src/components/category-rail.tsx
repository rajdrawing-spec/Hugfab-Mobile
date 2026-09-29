/**
 * The category rail — circular thumbnails with labels beneath, horizontally
 * scrollable (`docs/ui-ux-guide.md` §4).
 *
 * `categories` has no image column yet, which the web app's own `CategorySummary`
 * notes as the ordinary case, so a circle without artwork draws a tinted initial
 * rather than a grey disc or an invented thumbnail. The web app does exactly the
 * same thing for the same reason.
 *
 * The tints cycle through the brand's own accents rather than a random hue per
 * label: a rail of nine arbitrary colours is noise, and one of three rotating
 * accents still tells the circles apart.
 */

import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './text';
import { Touchable } from './pressable';

/** The guide's list, in its order. */
const CATEGORIES = [
  { slug: 'topwear', label: 'Topwear' },
  { slug: 'bottomwear', label: 'Bottomwear' },
  { slug: 'dresses', label: 'Dresses' },
  { slug: 'footwear', label: 'Footwear' },
  { slug: 'accessories', label: 'Accessories' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'beauty', label: 'Beauty' },
] as const;

const TINTS = ['bg-error-soft', 'bg-info-soft', 'bg-success-soft'] as const;
const TINT_TEXT = ['primary', 'info', 'success'] as const;

export function CategoryRail(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
      >
        {CATEGORIES.map((category, index) => (
          <Touchable
            key={category.slug}
            accessibilityRole="link"
            accessibilityLabel={category.label}
            press="card"
            onPress={() =>
              router.push({ pathname: '/search', params: { category: category.slug } })
            }
            className="mr-4 w-16 items-center"
          >
            <View
              className={`h-16 w-16 items-center justify-center rounded-full ${
                TINTS[index % TINTS.length] ?? 'bg-surface-2'
              }`}
            >
              <Text
                step="h3"
                weight="bold"
                tone={TINT_TEXT[index % TINT_TEXT.length] ?? 'muted'}
              >
                {category.label.slice(0, 1)}
              </Text>
            </View>
            <Text step="caption" className="mt-1.5 text-center" numberOfLines={1}>
              {category.label}
            </Text>
          </Touchable>
        ))}
      </ScrollView>
    </View>
  );
}
