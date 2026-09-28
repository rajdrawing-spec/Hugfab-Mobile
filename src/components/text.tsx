/**
 * Text, at a scale step.
 *
 * React Native's `Text` takes no font size from a stylesheet cascade, so every
 * piece of copy in the app has to name its step. Naming it through this component
 * rather than with a class on a raw `<Text>` means the scale stays countable: the
 * steps are the eight in `src/theme/tokens.json` and there is no ninth invented at
 * a call site.
 *
 * `color` defaults to the body colour, so a heading on a dark panel says so once.
 */

import { Text as RNText, type TextProps } from 'react-native';
import type { ColorToken } from '@/theme';

type Step = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'button';

const STEP_CLASS: Record<Step, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  body: 'text-body',
  small: 'text-small',
  caption: 'text-caption',
  button: 'text-button',
};

const COLOR_CLASS: Partial<Record<ColorToken, string>> = {
  text: 'text-text',
  muted: 'text-muted',
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  surface: 'text-surface',
  'primary-foreground': 'text-primary-foreground',
  'dark-foreground': 'text-dark-foreground',
};

export interface AppTextProps extends TextProps {
  step?: Step;
  tone?: keyof typeof COLOR_CLASS;
  /** Tailwind's `font-*`, for the one-off bolder line inside a step. */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

const WEIGHT_CLASS = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

export function Text({
  step = 'body',
  tone = 'text',
  weight,
  className,
  ...rest
}: AppTextProps): React.JSX.Element {
  return (
    <RNText
      className={[
        STEP_CLASS[step],
        COLOR_CLASS[tone] ?? 'text-text',
        weight ? WEIGHT_CLASS[weight] : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
