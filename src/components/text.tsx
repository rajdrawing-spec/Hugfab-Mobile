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
 *
 * Weight is a **font family**, not a `fontWeight`. Poppins ships one file per
 * weight, and React Native cannot synthesise a bold from a regular file the way
 * a browser will — asking for `fontWeight: 700` on `Poppins_400Regular` silently
 * gives you regular on Android and a smeared fake bold on iOS. So each step
 * names the family it wants, and `weight` overrides the family rather than a
 * numeric weight.
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

/** The family each step is set in, before any `weight` override. */
const STEP_FAMILY: Record<Step, string> = {
  display: 'font-bold',
  h1: 'font-bold',
  h2: 'font-semibold',
  h3: 'font-semibold',
  body: 'font-sans',
  small: 'font-sans',
  caption: 'font-sans',
  button: 'font-semibold',
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
  'surface-2': 'text-surface-2',
  'dark-foreground': 'text-dark-foreground',
};

export interface AppTextProps extends TextProps {
  step?: Step;
  tone?: keyof typeof COLOR_CLASS;
  /** Tailwind's `font-*`, for the one-off bolder line inside a step. */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

const WEIGHT_CLASS = {
  normal: 'font-sans',
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
        weight ? WEIGHT_CLASS[weight] : STEP_FAMILY[step],
        COLOR_CLASS[tone] ?? 'text-text',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
