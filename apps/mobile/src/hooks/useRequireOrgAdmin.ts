import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import type { AccountType } from '@dental/types';
import { verifyOrgMembership } from '@mobile/lib/orgContext';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export function useRequireOrgAdmin(expectedType: 'clinic' | 'laboratory', orgId: string | undefined) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const accountType = useAuthStore((s) => s.accountType);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!orgId || !userId) {
        if (!cancelled) {
          setVerified(false);
          setChecking(false);
        }
        return;
      }

      if (accountType !== expectedType) {
        if (!cancelled) {
          setVerified(false);
          setChecking(false);
          router.replace('/(tabs)/profile');
        }
        return;
      }

      const ok = await verifyOrgMembership(supabase, userId, accountType as AccountType, orgId);
      if (cancelled) return;

      setVerified(ok);
      setChecking(false);
      if (!ok) router.replace('/(tabs)/profile');
    }

    setChecking(true);
    check();
    return () => {
      cancelled = true;
    };
  }, [accountType, expectedType, orgId, router, userId]);

  return { verified, checking };
}
