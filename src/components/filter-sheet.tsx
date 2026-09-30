/**
 * The filter and sort sheets.
 *
 * Only what `/api/products` documents. The brief asks for size and colour
 * filters too, and the reference image shows them — but the route takes no such
 * parameter, so a size chip here would be a control that changes nothing. Drawing
 * it would be worse than omitting it: a filter that silently does not filter
 * teaches somebody the results are wrong. Both are in `docs/API-GAPS.md`.
 *
 * Discount is likewise absent. `discountPercent` is computed per offer for
 * display; there is no `minDiscount` to sort or filter on.
 *
 * Price is two bands rather than the reference's slider. `minPrice`/`maxPrice`
 * are real parameters, but a two-handle slider is a gesture control that wants a
 * native module Expo Go does not carry — so the bands are honest and tappable,
 * and the slider is a Phase 2 note.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { Text } from './text';
import { Button } from './button';
import { Chip } from './chip';
import { BottomSheet } from './bottom-sheet';
import { formatMoney, toMajorUnits, type Money } from '@/lib/money';
import { SORT_OPTIONS, type ProductFilters } from '@/api/products';
import type { Gender } from '@/api/types';

export interface DraftFilters {
  gender: Gender | null;
  maxPrice: number | null;
  inStock: boolean;
}

const GENDERS: readonly { value: Gender; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];

const inr = (minor: number): Money => ({ amountMinor: minor, currency: 'INR' });
const BANDS = [49_900, 99_900, 250_000, 500_000].map((minor) => ({
  label: `Under ${formatMoney(inr(minor))}`,
  value: toMajorUnits(inr(minor)),
}));

export function FilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: DraftFilters;
  onClose: () => void;
  onApply: (next: DraftFilters) => void;
}): React.JSX.Element {
  // A draft, so closing without applying leaves the results as they were.
  const [draft, setDraft] = useState<DraftFilters>(value);

  return (
    <BottomSheet
      visible={visible}
      title="Filter"
      onClose={onClose}
      footer={
        <View className="flex-row">
          <Button
            label="Clear all"
            variant="outline"
            pill
            className="flex-1"
            onPress={() => setDraft({ gender: null, maxPrice: null, inStock: false })}
          />
          <View className="w-3" />
          <Button
            label="Apply filters"
            pill
            className="flex-[2]"
            onPress={() => onApply(draft)}
          />
        </View>
      }
    >
      <Section title="Gender">
        {GENDERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={draft.gender === option.value}
            onPress={() =>
              setDraft({
                ...draft,
                gender: draft.gender === option.value ? null : option.value,
              })
            }
          />
        ))}
      </Section>

      <Section title="Price">
        {BANDS.map((band) => (
          <Chip
            key={band.label}
            label={band.label}
            selected={draft.maxPrice === band.value}
            onPress={() =>
              setDraft({
                ...draft,
                maxPrice: draft.maxPrice === band.value ? null : band.value,
              })
            }
          />
        ))}
      </Section>

      <Section title="Availability">
        <Chip
          label="In stock only"
          selected={draft.inStock}
          onPress={() => setDraft({ ...draft, inStock: !draft.inStock })}
        />
      </Section>

      <Text step="caption" tone="muted" className="mt-4">
        Size, colour and discount filters need catalogue parameters the API does not
        expose yet — see docs/API-GAPS.md. They are left out rather than drawn as controls
        that would not filter anything.
      </Text>
    </BottomSheet>
  );
}

export function SortSheet({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: ProductFilters['sort'];
  onClose: () => void;
  onSelect: (sort: ProductFilters['sort']) => void;
}): React.JSX.Element {
  return (
    <BottomSheet visible={visible} title="Sort by" onClose={onClose}>
      <View className="flex-row flex-wrap">
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
      <Text step="caption" tone="muted" className="mt-4">
        Highest discount and rating are not sortable: the API has no rating, and the
        discount is computed per offer rather than stored on a product.
      </Text>
    </BottomSheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="mb-5">
      <Text step="body" weight="semibold" className="mb-3">
        {title}
      </Text>
      <View className="flex-row flex-wrap">{children}</View>
    </View>
  );
}
