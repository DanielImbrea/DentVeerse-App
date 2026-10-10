import '../global.css';
import '@mobile/lib/i18n';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, useRouter, useSegments } from 'expo-router';
import { initMobileMonitoring } from '@dental/monitoring';
import { initAnalytics, setAnalyticsEnabled, identifyUser, resetAnalyticsIdentity } from '@dental/analytics';
import { queryClient } from '@mobile/lib/queryClient';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';
import { registerDevice, subscribeToGlobalPresence } from '@dental/api';
import { isOnboardingComplete, getOnboardingPath } from '@mobile/lib/onboarding';
import { getNotificationRoute } from '@mobile/lib/notificationRoutes';
import { loadAppFonts } from '@mobile/lib/fonts';
import { isSupabaseConfigured } from '@mobile/lib/supabase';
import { SupabaseConfigErrorScreen } from '@mobile/components/SupabaseConfigErrorScreen';

try {
  initMobileMonitoring();
  initAnalytics();
} catch (err) {
  console.warn('[startup] Monitoring/analytics init failed:', err);
}
// Defaults to disabled per packages/analytics/src/mobile.ts's consent note
// — flip to `true` once the actual consent-prompt UI exists and the person
// has opted in. Left enabled-by-default=false here deliberately rather
// than true, since silently starting to track before any consent UI exists
// would be the wrong default to ship.
setAnalyticsEnabled(false);

/**
 * Registers this device for push notifications (real call to
 * expo-notifications — NEVER executed in this environment, needs a real
 * device/simulator with push capability, see
 * docs/17-implementation-status.md §18) and tracks this user on the global
 * presence channel (confirmed platform-wide scope per
 * docs/16-client-decisions-mvp-scope-update.md §3). Runs once per
 * authenticated session.
 */
function usePushAndPresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    let presenceChannel: ReturnType<typeof subscribeToGlobalPresence> | null = null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const canRegisterPush = projectId && Constants.appOwnership !== 'expo';

    if (canRegisterPush) {
      (async () => {
        try {
          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
            await registerDevice(supabase, tokenResponse.data, Platform.OS === 'ios' ? 'ios' : 'android');
          }
        } catch (err) {
          // Push is best-effort — Expo Go has no EAS projectId; don't surface as a red error.
          console.warn('Push registration skipped:', err);
        }
      })();
    }

    try {
      presenceChannel = subscribeToGlobalPresence(supabase, userId);
      presenceChannel
        .on('presence', { event: 'sync' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel?.track({ online_at: new Date().toISOString() });
          }
        });
    } catch (err) {
      console.warn('Presence subscription failed:', err);
    }

    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [userId]);
}

function useNotificationRouting(userId: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    let responseSub: { remove: () => void } | null = null;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as {
            target_type?: string | null;
            target_id?: string | null;
            type?: string;
          };
          const route = getNotificationRoute({
            type: data.type ?? '',
            target_type: data.target_type ?? null,
            target_id: data.target_id ?? null,
          });
          if (route) router.push(route as never);
        });
      } catch (err) {
        console.warn('Notification routing skipped:', err);
      }
    })();

    return () => {
      responseSub?.remove();
    };
  }, [userId, router]);
}

/**
 * Root layout. Implements the routing decision tree from docs/04-mobile.md
 * §2: unauthenticated -> (auth), authenticated-but-incomplete-profile ->
 * (onboarding), authenticated-and-complete -> (tabs).
 *
 * "Onboarding complete" is determined by whether the account-type-specific
 * profile row exists (patient_profiles / clinics / laboratories) — matches
 * the gate described in docs/04-mobile.md §2 ("at minimum name+city+one
 * service before being allowed into the main app" — the "+one service" part
 * is NOT enforced here, only name+city via the onboarding forms themselves;
 * enforcing the service requirement too is a product-strictness decision
 * left for Cursor to tighten if desired).
 */
export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <SupabaseConfigErrorScreen />
      </SafeAreaProvider>
    );
  }

  return <RootLayoutApp />;
}

function RootLayoutApp() {
  const setSession = useAuthStore((s) => s.setSession);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const accountType = useAuthStore((s) => s.accountType);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const userId = useAuthStore((s) => s.userId);
  const [initializing, setInitializing] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  usePushAndPresence(userId);
  useNotificationRouting(userId);

  useEffect(() => {
    loadAppFonts()
      .catch((err) => console.warn('[fonts] Open Sans load failed:', err))
      .finally(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    async function resolveSession(userId: string | null) {
      if (!userId) {
        setSession(null, null);
        setOnboarded(false);
        return;
      }

      const { data: userRow } = await supabase.from('users').select('account_type').eq('id', userId).single();
      const resolvedType = userRow?.account_type ?? null;
      setSession(userId, resolvedType);

      if (resolvedType) {
        identifyUser(userId, resolvedType);
      } else {
        resetAnalyticsIdentity();
      }

      if (!resolvedType) {
        setOnboarded(false);
        return;
      }

      const onboarded = await isOnboardingComplete(supabase, userId, resolvedType);
      setOnboarded(onboarded);
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await resolveSession(data.session?.user.id ?? null);
      })
      .catch(async (err) => {
        console.warn('[auth] getSession failed — clearing local session hint:', err);
        await resolveSession(null);
      })
      .finally(() => setInitializing(false));

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await resolveSession(session?.user.id ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setOnboarded]);

  useEffect(() => {
    if (initializing) return;

    const userId = useAuthStore.getState().userId;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!userId && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (userId && !accountType && !inAuthGroup) {
      router.replace('/(auth)/choose-account-type');
    } else if (userId && accountType && !isOnboarded && !inOnboardingGroup) {
      void getOnboardingPath(supabase, userId, accountType).then((path) => router.replace(path as never));
    } else if (userId && accountType && isOnboarded && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(tabs)/home');
    }
  }, [initializing, accountType, isOnboarded, segments, router]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {initializing || !fontsReady ? (
          <View className="absolute inset-0 z-10 bg-background items-center justify-center">
            <ActivityIndicator size="large" color="#0F6B66" />
          </View>
        ) : null}
        <Slot />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
