/**
 * The three badge variants the web guide names: `solid` (Best Price), `soft`
 * (In Stock) and `text`.
 */

import { View } from 'react-native';
import { Text } from './text';

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'muted';

const SOLID: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  muted: 'bg-surface-2',
};

const SOFT: Record<Tone, string> = {
  primary: 'bg-error-soft',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  info: 'bg-info-soft',
  muted: 'bg-surface-2',
};

const SOFT_TEXT: Record<Tone, 'primary' | 'success' | 'warning' | 'info' | 'muted'> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  info: 'info',
  muted: 'muted',
};

export function Badge({
  label,
  tone = 'primary',
  variant = 'soft',
}: {
  label: string;
  tone?: Tone;
  variant?: 'solid' | 'soft';
}): React.JSX.Element {
  return (
    <View
      className={`self-start rounded-sm px-2 py-0.5 ${
        variant === 'solid' ? SOLID[tone] : SOFT[tone]
      }`}
    >
      <Text
        step="caption"
        weight="semibold"
        tone={variant === 'solid' ? 'primary-foreground' : SOFT_TEXT[tone]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Availability in the shopper's words. The API's enum has five values and four of
 * them are not "in stock"; collapsing them to a boolean would tell someone a
 * discontinued product is merely unavailable today.
 */
export function AvailabilityBadge({
  availability,
}: {
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued' | 'unknown';
}): React.JSX.Element | null {
  switch (availability) {
    case 'in_stock':
      return <Badge label="In stock" tone="success" />;
    case 'out_of_stock':
      return <Badge label="Out of stock" tone="muted" />;
    case 'preorder':
      return <Badge label="Pre-order" tone="info" />;
    case 'discontinued':
      return <Badge label="Discontinued" tone="muted" />;
    case 'unknown':
      // The feed did not say. Claiming either way would be inventing stock data.
      return null;
  }
}
