import { router } from 'expo-router';
import { resetAnalyticsIdentity } from '@dental/analytics';
import { queryClient } from '@mobile/lib/queryClient';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

/** Signs out, clears client state, and resets navigation to the auth screen. */
export async function signOutAndReset(scope: 'local' | 'global' = 'local') {
  resetAnalyticsIdentity();
  queryClient.clear();

  const { error } =
    scope === 'global'
      ? await supabase.auth.signOut({ scope: 'global' })
      : await supabase.auth.signOut();

  if (error) throw error;

  useAuthStore.getState().reset();

  if (router.canDismiss()) {
    router.dismissAll();
  }

  router.replace('/(auth)/sign-in');
}
