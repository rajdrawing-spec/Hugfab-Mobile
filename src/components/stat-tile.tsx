/**
 * A count, with what it counts under it.
 *
 * `emphasis` raises the ones that mean somebody is waiting — a new order, an
 * open return. Everything else is context, and context drawn at the same weight
 * as an obligation is how a dashboard stops being read.
 *
 * A tile is tappable only when there is somewhere to go. One that is not stays a
 * plain View rather than a Pressable with no handler, because a control that does
 * nothing when pressed is worse than no control.
 */

import { Pressable, View } from 'react-native';
import { Text } from './text';

export function StatTile({
  value,
  label,
  emphasis = false,
  onPress,
}: {
  value: number;
  label: string;
  emphasis?: boolean;
  onPress?: () => void;
}): React.JSX.Element {
  const body = (
    <>
      <Text step="h2" tone={emphasis && value > 0 ? 'primary' : 'text'}>
        {String(value)}
      </Text>
      <Text step="caption" tone="muted" className="mt-0.5">
        {label}
      </Text>
    </>
  );

  const className = 'bg-surface flex-1 rounded-lg border border-border p-3';

  if (!onPress) {
    return (
      <View className={className} accessibilityLabel={`${String(value)} ${label}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${String(value)} ${label}`}
      onPress={onPress}
      className={className}
    >
      {body}
    </Pressable>
  );
}

/**
 * A row of tiles. React Native has no grid, and `flex-wrap` with `flex-1`
 * children collapses, so a row is an explicit component rather than a wrap.
 */
export function StatRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View className="mb-3 flex-row gap-3">{children}</View>;
}
