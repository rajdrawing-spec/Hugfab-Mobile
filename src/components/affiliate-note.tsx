/**
 * The affiliate disclosure.
 *
 * `docs/ui-ux-guide.md` §6: it appears on **any surface with an outbound buy
 * link**, not only in the footer — and PRD §74 is where that comes from. It is a
 * compliance requirement, not a design flourish, which is why it is a component
 * rather than a sentence somebody remembers to paste.
 *
 * Deliberately quiet but not hidden: `caption` on `muted` is readable, and the
 * rule is disclosure, not prominence.
 */

import { View } from 'react-native';
import { Text } from './text';

export function AffiliateNote({ className }: { className?: string }): React.JSX.Element {
  return (
    <View className={className}>
      <Text step="caption" tone="muted">
        HugFab may earn a commission when you buy through these links. It never changes
        the price you pay, and it never changes how offers are ordered.
      </Text>
    </View>
  );
}
