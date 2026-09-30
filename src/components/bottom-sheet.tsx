/**
 * A bottom sheet.
 *
 * React Native's `Modal` with a slide animation, rather than a gesture library:
 * the brief asks for sheets, not for a draggable one, and every gesture-driven
 * sheet package worth using brings a native module Expo Go does not carry.
 *
 * The scrim closes it, `onRequestClose` gives Android's back button the same
 * effect, and the sheet itself stops touches from reaching the scrim. Content
 * scrolls; the action row is pinned, because a sheet whose Apply button is below
 * the fold is a sheet people abandon.
 */

import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Touchable } from './pressable';
import { color } from '@/theme';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
        onPress={onClose}
        className="flex-1 justify-end bg-scrim"
      >
        {/* A Pressable that swallows the press, so tapping the sheet does not
            close it through the scrim behind. */}
        <Pressable
          accessibilityRole="none"
          onPress={() => undefined}
          className="bg-surface max-h-[85%] rounded-t-xl"
        >
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <Text step="h3" className="flex-1">
              {title}
            </Text>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              className="p-1"
            >
              <Ionicons name="close" size={22} color={color('text')} />
            </Touchable>
          </View>

          <ScrollView contentContainerClassName="p-4">{children}</ScrollView>

          {footer ? (
            <View
              className="border-t border-border px-4 pt-3"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
