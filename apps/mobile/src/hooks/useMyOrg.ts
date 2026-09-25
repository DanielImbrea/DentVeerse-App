import { useQuery } from '@tanstack/react-query';
import { resolveMyOrg } from '@mobile/lib/orgContext';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export function useMyOrg() {
  const userId = useAuthStore((s) => s.userId);
  const accountType = useAuthStore((s) => s.accountType);

  return useQuery({
    queryKey: ['my-org', userId, accountType],
    queryFn: () => resolveMyOrg(supabase, userId as string, accountType as 'clinic' | 'laboratory'),
    enabled: !!userId && (accountType === 'clinic' || accountType === 'laboratory'),
  });
}
