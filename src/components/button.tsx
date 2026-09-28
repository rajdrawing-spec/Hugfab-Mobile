/**
 * The button variants from HUGFAB-AI `docs/design-system.md`: primary, secondary,
 * outline, text, and `dark` for a CTA over photography.
 *
 * `loading` disables and swaps the label for a spinner rather than leaving a live
 * button that fires twice — a double-tap on "Add to bag" on a slow connection is
 * two lines in the bag, and the person did nothing wrong.
 *
 * Every button carries `accessibilityRole` and, when it is icon-only, requires a
 * label. The web guide treats that as a condition of merge, and a phone has no
 * hover text to fall back on.
 */

import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { Text } from './text';
import { color } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'text' | 'dark' | 'danger';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'bg-transparent border border-border-strong',
  text: 'bg-transparent',
  dark: 'bg-dark',
  danger: 'bg-error',
};

const LABEL_TONE: Record<Variant, 'primary-foreground' | 'text' | 'primary'> = {
  primary: 'primary-foreground',
  secondary: 'primary-foreground',
  outline: 'text',
  text: 'primary',
  dark: 'primary-foreground',
  danger: 'primary-foreground',
};

const SPINNER_TOKEN: Record<Variant, Parameters<typeof color>[0]> = {
  primary: 'primary-foreground',
  secondary: 'primary-foreground',
  outline: 'text',
  text: 'primary',
  dark: 'primary-foreground',
  danger: 'primary-foreground',
};

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Pill chrome, as the guide's CTAs use. */
  pill?: boolean;
  fullWidth?: boolean;
  size?: 'md' | 'sm';
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  pill = false,
  fullWidth = false,
  size = 'md',
  disabled,
  className,
  ...rest
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled === true || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center',
        size === 'sm' ? 'px-4 py-2' : 'px-5 py-3.5',
        pill ? 'rounded-full' : 'rounded-md',
        CONTAINER[variant],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <View className="py-0.5">
          <ActivityIndicator size="small" color={color(SPINNER_TOKEN[variant])} />
        </View>
      ) : (
        <Text step="button" tone={LABEL_TONE[variant]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
