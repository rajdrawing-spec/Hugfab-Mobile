/**
 * The wishlist heart, top-right of a product card (`docs/ui-ux-guide.md` §4).
 *
 * It is drawn filled or hollow from the wishlist the server holds, never from
 * local state alone — a heart that fills on tap and empties on the next screen is
 * worse than no heart. `GET /api/wishlist` is `docs/API-GAPS.md` §2 and answers
 * 404 today, so until it ships every heart is hollow and a tap says why.
 *
 * The optimistic update is deliberate and bounded: the heart fills immediately
 * because a save that waits for a round trip feels broken, and `onError` rolls it
 * back to whatever the cache last knew. It never invents a state the server did
 * not confirm — it only shows the pending one early.
 */

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Touchable } from './pressable';
import { addToWishlist, listWishlist, removeFromWishlist } from '@/api/account';
import { describeError } from '@/api/errors';
import { queryKeys } from '@/query/keys';
import { useAuth } from '@/auth/session';
import { color, elevation } from '@/theme';
import type { WishlistItem } from '@/api/types';

export function WishlistHeart({
  productId,
  title,
}: {
  productId: string;
  title: string;
}): React.JSX.Element {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const wishlist = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: ({ signal }) => listWishlist(signal),
    enabled: status === 'signedIn',
    // A failure here is not this control's to report — the wishlist screen says
    // it properly. The heart simply stays hollow.
    retry: false,
  });

  const saved = Boolean(
    wishlist.data?.items.some((item: WishlistItem) => item.productId === productId),
  );

  const toggle = useMutation({
    mutationFn: () => (saved ? removeFromWishlist(productId) : addToWishlist(productId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() }),
    onError: (error) => {
      // Nothing to roll back — the cache was never written — but the person still
      // deserves to know why the heart did not change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      describeError(error);
    },
  });

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected: saved, busy: toggle.isPending }}
      accessibilityLabel={saved ? `Remove ${title} from your wishlist` : `Save ${title}`}
      hitSlop={8}
      onPress={() => {
        if (status !== 'signedIn') {
          router.push('/auth/login');
          return;
        }
        toggle.mutate();
      }}
    >
      <View
        className="bg-surface h-8 w-8 items-center justify-center rounded-full"
        style={elevation('sm')}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={17}
          color={saved ? color('primary') : color('muted')}
        />
      </View>
    </Touchable>
  );
}
