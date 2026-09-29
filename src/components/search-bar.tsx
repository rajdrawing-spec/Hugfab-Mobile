/**
 * The search bar, as `docs/ui-ux-guide.md` §4 specifies it: a full-width pill,
 * magnifier left, camera right.
 *
 * The camera is the visual-search entry point and the guide says it is present
 * on every instance. Visual search is Phase 2 (`docs/PLAN.md`), so the control is
 * drawn and says so when pressed rather than being left out — leaving it out
 * would quietly change the concept, and adding it later would move every other
 * element on the bar.
 *
 * Two modes. `onPress` makes the whole bar a button that navigates somewhere
 * with a real input — which is what Home wants, because a keyboard opening on a
 * browsing screen is a nuisance. Without it the bar is the input.
 */

import { TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Touchable } from './pressable';
import { color, elevation } from '@/theme';

/** The guide's own words. It names all four inputs on purpose. */
export const SEARCH_PLACEHOLDER = 'Search styles, brands, colours or a photo…';

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  /** Render as a button that navigates, rather than as a live input. */
  onPress?: () => void;
  onCameraPress?: () => void;
}

export function SearchBar({
  onPress,
  onCameraPress,
  value,
  placeholder = SEARCH_PLACEHOLDER,
  ...rest
}: SearchBarProps): React.JSX.Element {
  const frame =
    'bg-surface flex-row items-center rounded-full border border-border px-4 py-3';

  if (onPress) {
    return (
      <Touchable
        accessibilityRole="search"
        accessibilityLabel="Search the catalogue"
        onPress={onPress}
        press="card"
        style={elevation('sm')}
        className={frame}
      >
        <Ionicons name="search" size={18} color={color('muted')} />
        <Text
          step="small"
          tone="muted"
          numberOfLines={1}
          className="ml-2.5 min-w-0 flex-1"
        >
          {placeholder}
        </Text>
        <CameraButton onPress={onCameraPress} />
      </Touchable>
    );
  }

  return (
    <View className={frame} style={elevation('sm')}>
      <Ionicons name="search" size={18} color={color('muted')} />
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={color('muted')}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search the catalogue"
        // `min-w-0` alongside `flex-1`: a flex child's minimum size is its
        // content by default, so a long placeholder pushes the pill wider than
        // its parent instead of ellipsing inside it.
        className="ml-2.5 min-w-0 flex-1 font-sans text-body text-text"
        {...rest}
      />
      <CameraButton onPress={onCameraPress} />
    </View>
  );
}

function CameraButton({ onPress }: { onPress?: () => void }): React.JSX.Element {
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Search with a photo"
      accessibilityHint="Visual search is not available in this version"
      onPress={onPress}
      className="-mr-1 pl-3"
    >
      <Ionicons name="camera-outline" size={20} color={color('primary')} />
    </Touchable>
  );
}
