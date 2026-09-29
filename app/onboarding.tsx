/**
 * The intro as a route.
 *
 * The launch gate in `app/_layout.tsx` renders `<Onboarding>` directly rather
 * than navigating here — see the note there for why. This route exists for the
 * two cases the gate cannot serve: opening the intro again from Account, and
 * being able to look at it without clearing app storage first.
 *
 * It marks the intro seen on finish, exactly as the gate does, so replaying it
 * never un-onboards anybody.
 */

import { useRouter } from 'expo-router';
import { Onboarding } from '@/onboarding/onboarding';
import { markOnboardingSeen } from '@/onboarding/storage';

export default function OnboardingRoute(): React.JSX.Element {
  const router = useRouter();

  return (
    <Onboarding
      onDone={() => {
        void markOnboardingSeen();
        router.replace('/');
      }}
    />
  );
}
