/**
 * Home.
 *
 * Each rail is its own query, so one slow or failing section does not hold up the
 * rest of the screen — and pull-to-refresh refetches them all.
 *
 * The note at the foot is deliberate. This is not the merchandising an admin
 * arranged at `/admin/homepage`, because there is no endpoint for that yet
 * (`docs/API-GAPS.md` §7), and a screen that quietly substitutes its own rules for
 * someone else's editorial decisions is the kind of thing nobody notices until a
 * campaign does not appear.
 */

import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/text';
import { ProductRail } from '@/components/product-rail';
import { ErrorState } from '@/components/states';
import { LOCAL_HOME_SECTIONS } from '@/home/sections';
import { features, missingConfigMessage } from '@/lib/env';
import { color } from '@/theme';

export default function HomeScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void queryClient
      .invalidateQueries({ queryKey: ['products'] })
      .finally(() => setRefreshing(false));
  }, [queryClient]);

  if (!features.api) {
    return <ErrorState error={new Error(missingConfigMessage() ?? 'Not configured.')} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={color('primary')}
        />
      }
    >
      {LOCAL_HOME_SECTIONS.map((section) =>
        section.kind === 'product_rail' ? (
          <ProductRail
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            filters={section.filters}
            seeAll={section.seeAll}
          />
        ) : null,
      )}

      <View className="border-t border-border px-4 py-6">
        <Text step="caption" tone="muted">
          These rows are built from the catalogue, not from the merchandising set on the
          HugFab website. Deals and the editorial homepage arrive in a later release.
        </Text>
      </View>
    </ScrollView>
  );
}
