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
 *
 * A filled button is raised in its own colour rather than in grey — a red button
 * casting a grey shadow looks like a sticker. `outline` and `text` stay flat:
 * they are the quieter options and a shadow would argue with that.
 */

import { ActivityIndicator, View, type PressableProps } from 'react-native';
import { Text } from './text';
import { Touchable } from './pressable';
import { color, elevation } from '@/theme';

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

/** A filled button's shadow takes its own hue, so the lift reads as light. */
const SHADOW_TOKEN: Record<Variant, Parameters<typeof color>[0]> = {
  primary: 'primary',
  secondary: 'secondary',
  outline: 'dark',
  text: 'dark',
  dark: 'dark',
  danger: 'error',
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

  const raised = variant === 'primary' || variant === 'secondary' || variant === 'dark';

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      style={
        raised && !isDisabled
          ? { ...elevation('sm'), shadowColor: color(SHADOW_TOKEN[variant]) }
          : undefined
      }
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
    </Touchable>
  );
}
