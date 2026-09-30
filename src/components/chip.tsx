/**
 * A filter chip. `accessibilityState.selected` rather than colour alone: the web
 * guide treats "state is announced, not merely coloured" as a condition of merge,
 * and a screen reader has no way to see a red background.
 */

import { Text } from './text';
import { Touchable } from './pressable';
import { color, elevation } from '@/theme';

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
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={selected ? { ...elevation('sm'), shadowColor: color('primary') } : undefined}
      className={`mb-2 mr-2 rounded-full border px-3.5 py-2 ${
        selected ? 'bg-primary border-primary' : 'bg-surface border-border'
      }`}
    >
      <Text
        step="small"
        weight={selected ? 'semibold' : 'normal'}
        tone={selected ? 'primary-foreground' : 'text'}
      >
        {label}
      </Text>
    </Touchable>
  );
}
