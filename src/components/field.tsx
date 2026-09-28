/**
 * A labelled text field.
 *
 * The label is required, not optional. The web guide requires one on every `Input`
 * and offers `hideLabel` for the visual-only case; on a phone there is no hover
 * text and a placeholder disappears the moment someone types, so a field whose only
 * label was its placeholder is unlabelled exactly when it matters.
 *
 * `error` is wired to the field's accessibility hint as well as drawn, because a
 * red border announces nothing.
 */

import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './text';
import { color } from '@/theme';

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export function Field({
  label,
  error,
  hint,
  className,
  ...rest
}: FieldProps): React.JSX.Element {
  return (
    <View className="mb-4">
      <Text step="small" weight="medium">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={color('muted')}
        className={[
          'bg-surface mt-1.5 rounded-md border px-3 py-2.5 text-body text-text',
          error ? 'border-error' : 'border-border-strong',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <Text
          step="caption"
          tone="error"
          className="mt-1"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : (
        hint && (
          <Text step="caption" tone="muted" className="mt-1">
            {hint}
          </Text>
        )
      )}
    </View>
  );
}
