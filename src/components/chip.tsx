/**
 * A filter chip. `accessibilityState.selected` rather than colour alone: the web
 * guide treats "state is announced, not merely coloured" as a condition of merge,
 * and a screen reader has no way to see a red background.
 */

import { Pressable } from 'react-native';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`mr-2 mb-2 rounded-sm border px-3 py-1.5 ${
        selected ? 'bg-primary border-primary' : 'bg-surface border-border'
      }`}
    >
      <Text step="small" tone={selected ? 'primary-foreground' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}
