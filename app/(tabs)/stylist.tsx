/**
 * The AI Stylist.
 *
 * The brief asks for a three-step wizard — occasion, budget, style — rather than
 * a chat box, and it is right: a blank prompt asks a shopper to do the work of
 * describing themselves, and most will not. The wizard composes those three
 * answers into one sentence and sends it to `POST /api/stylist`, which is a real
 * endpoint that runs a real model against the real catalogue.
 *
 * So the cards below the answer are genuine. The service picks ids from what its
 * search tool actually returned and drops anything the model invented before the
 * reply is built — `droppedInvented` says when that happened, and this screen
 * surfaces it rather than hiding a model that made something up.
 *
 * What the brief asks for and this cannot do: a per-product "why we picked this".
 * The reply carries one `text` for the whole set, not a rationale per card, so
 * the answer is shown once above the products rather than invented per card.
 * `docs/API-GAPS.md` records what a per-product reason would need.
 */

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { AppHeader } from '@/components/app-header';
import { ProductCard } from '@/components/product-card';
import { AffiliateNote } from '@/components/affiliate-note';
import { ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { askStylist } from '@/api/stylist';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth/session';
import { formatMoney } from '@/lib/money';
import { elevation } from '@/theme';

const OCCASIONS = ['Party', 'Office', 'Casual', 'Wedding', 'Travel', 'Date night'];
/**
 * Budget bands, in minor units. The labels are formatted rather than typed, so
 * the symbol comes from `Intl` and a second market changes one constant instead
 * of four strings — the rule `docs/design-system.md` sets and the lint enforces.
 *
 * `phrase` is what the model reads. It is plain English with bare numbers on
 * purpose: a formatted "₹1,000" invites the model to echo a price back in its
 * prose, and the service guarantees that prose carries no prices.
 */
const INR = 'INR';
const band = (minor: number) => formatMoney({ amountMinor: minor, currency: INR });

const BUDGETS = [
  { label: `Under ${band(50_000)}`, phrase: 'under 500 rupees' },
  { label: `${band(50_000)}–${band(100_000)}`, phrase: 'between 500 and 1000 rupees' },
  {
    label: `${band(100_000)}–${band(250_000)}`,
    phrase: 'between 1000 and 2500 rupees',
  },
  { label: `${band(250_000)}+`, phrase: 'above 2500 rupees' },
];
const STYLES = ['Trendy', 'Minimal', 'Traditional', 'Streetwear', 'Sporty', 'Elegant'];

export default function StylistScreen(): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const [occasion, setOccasion] = useState<string | null>(null);
  const [budget, setBudget] = useState<(typeof BUDGETS)[number] | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  const ask = useMutation({
    mutationFn: () =>
      askStylist(
        // One sentence rather than three fields: the endpoint takes prose, and
        // prose is what the model reads best.
        `I am looking for ${style?.toLowerCase() ?? 'something'} outfits for ${
          occasion?.toLowerCase() ?? 'any occasion'
        }, ${budget?.phrase ?? 'at any price'}.`,
      ),
  });

  const ready = occasion !== null && budget !== null && style !== null;

  if (status === 'signedOut') {
    return (
      <View className="flex-1 bg-background">
        <AppHeader title="AI Stylist" />
        <SignInPrompt
          title="Sign in to ask the stylist"
          body="The stylist answers against your account so your picks and your credits stay with you."
          onSignIn={() => router.push('/auth/login')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader title="AI Stylist" />
      <ScrollView
        contentContainerClassName="p-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-primary-soft rounded-lg p-4" style={elevation('sm')}>
          <Text step="h3">Your personal AI fashion stylist</Text>
          <Text step="small" tone="muted" className="mt-1">
            Tell us the occasion, the budget and the look. We will search the catalogue
            and show you what actually fits.
          </Text>
        </View>

        <Step index={1} title="What are you shopping for?">
          {OCCASIONS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={occasion === item}
              onPress={() => setOccasion(occasion === item ? null : item)}
            />
          ))}
        </Step>

        <Step index={2} title="What is your budget?">
          {BUDGETS.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              selected={budget?.label === item.label}
              onPress={() => setBudget(budget?.label === item.label ? null : item)}
            />
          ))}
        </Step>

        <Step index={3} title="What is your style?">
          {STYLES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={style === item}
              onPress={() => setStyle(style === item ? null : item)}
            />
          ))}
        </Step>

        <Button
          label="Get my style picks"
          pill
          fullWidth
          className="mt-6"
          loading={ask.isPending}
          disabled={!ready}
          onPress={() => ask.mutate()}
        />
        {!ready ? (
          <Text step="caption" tone="muted" className="mt-2 text-center">
            Pick one from each step.
          </Text>
        ) : null}

        {ask.isPending ? (
          <View className="mt-8">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <View className="mt-4 flex-row">
              <View className="w-1/2">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              </View>
              <View className="w-1/2">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              </View>
            </View>
          </View>
        ) : null}

        {ask.isError ? (
          <View className="mt-6">
            <ErrorState
              error={ask.error}
              onRetry={
                ask.error instanceof ApiError && ask.error.code === 'UNAUTHORIZED'
                  ? undefined
                  : () => ask.mutate()
              }
            />
          </View>
        ) : null}

        {ask.data ? (
          <View className="mt-8">
            <Text step="h3">Your style picks</Text>

            {/* Labelled as AI output, which the guide's §6 requires of every AI
                surface — "never softened into implied fact". */}
            <View className="bg-surface mt-3 rounded-lg p-4" style={elevation('sm')}>
              <Text step="caption" tone="primary" weight="semibold">
                THE STYLIST SAYS
              </Text>
              <Text step="small" className="mt-1.5">
                {ask.data.text}
              </Text>
            </View>

            {ask.data.droppedInvented ? (
              <View className="bg-warning-soft mt-3 rounded-md p-3">
                <Text step="caption" tone="warning">
                  The stylist named something that is not in the catalogue, so it was left
                  out. Only real products are shown below.
                </Text>
              </View>
            ) : null}

            {ask.data.products.length > 0 ? (
              <>
                <View className="mt-3 flex-row flex-wrap">
                  {ask.data.products.map((product) => (
                    <View key={product.id} className="w-1/2">
                      <ProductCard product={product} />
                    </View>
                  ))}
                </View>
                <AffiliateNote className="mt-4" />
              </>
            ) : (
              <Text step="small" tone="muted" className="mt-3">
                Nothing in the catalogue matched closely enough. Try a wider budget or a
                different style.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center">
        <View className="bg-primary h-6 w-6 items-center justify-center rounded-full">
          <Text step="caption" tone="primary-foreground" weight="bold">
            {String(index)}
          </Text>
        </View>
        <Text step="body" weight="semibold" className="ml-2.5">
          {title}
        </Text>
      </View>
      <View className="flex-row flex-wrap">{children}</View>
    </View>
  );
}
