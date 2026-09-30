/**
 * Community.
 *
 * The brief wants a fashion feed — posts, outfits, "shop the look", saves. The
 * web app has all of it at `/community`, and **none of it over HTTP**: every
 * read is a server component and every write is a server action
 * (`src/app/(shop)/community/actions.ts`). React Native can call neither.
 *
 * So this screen does the one honest thing available: it says what Community is,
 * says it is on the website for now, and opens it. The alternative — a feed of
 * placeholder posts, or a "coming soon" with no way through — is worse on both
 * counts, and inventing posts would break the rule that governs this whole app.
 *
 * `docs/API-GAPS.md` §8 specifies the endpoints this screen needs. When they
 * ship, this file becomes a feed and nothing else here changes.
 */

import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { AppHeader } from '@/components/app-header';
import { openWebPage } from '@/lib/links';
import { color, elevation } from '@/theme';

const WHAT_IT_IS = [
  {
    icon: 'shirt-outline' as const,
    title: 'Outfits, with the products attached',
    body: 'Every look on the feed carries the pieces in it, so a photo is something you can actually shop.',
  },
  {
    icon: 'chatbubbles-outline' as const,
    title: 'Styling questions',
    body: 'Ask what goes with what, and get answers from people who bought it.',
  },
  {
    icon: 'pricetags-outline' as const,
    title: 'Deals people found',
    body: 'Shared price drops and finds, with the retailer named.',
  },
];

export default function CommunityScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Community" />
      <ScrollView
        contentContainerClassName="p-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-primary-soft rounded-lg p-5" style={elevation('sm')}>
          <Text step="h3">Community is on the website</Text>
          <Text step="small" tone="muted" className="mt-1.5">
            The feed runs on the web app and has no mobile API yet, so it is not in the
            app. Rather than show you an empty shell, here is the way in.
          </Text>
          <Button
            label="Open Community"
            pill
            className="mt-4 self-start"
            onPress={() => void openWebPage('/community')}
          />
        </View>

        <Text step="h3" className="mb-1 mt-8">
          What you will find there
        </Text>

        {WHAT_IT_IS.map((item) => (
          <View
            key={item.title}
            className="bg-surface mt-3 flex-row rounded-lg p-4"
            style={elevation('sm')}
          >
            <View className="bg-primary-soft h-10 w-10 items-center justify-center rounded-full">
              <Ionicons name={item.icon} size={19} color={color('primary')} />
            </View>
            <View className="flex-1 pl-3">
              <Text step="small" weight="semibold">
                {item.title}
              </Text>
              <Text step="caption" tone="muted" className="mt-1">
                {item.body}
              </Text>
            </View>
          </View>
        ))}

        <Text step="caption" tone="muted" className="mt-8">
          Building this in the app needs a read and a write endpoint for the feed — see
          docs/API-GAPS.md §8. Nothing on this screen is a placeholder for content that
          exists; it is a signpost to content that does.
        </Text>
      </ScrollView>
    </View>
  );
}
