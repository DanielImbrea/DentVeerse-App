import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { AccountType } from '@dental/types';
import { useAuthStore } from '@mobile/stores/authStore';

type Options = {
  redirectTo?: string;
};

/**
 * Redirects when the signed-in account type is not in `allowed`.
 * Returns `isAllowed` once account type is known.
 */
export function useRequireAccountType(allowed: AccountType | AccountType[], options: Options = {}) {
  const router = useRouter();
  const accountType = useAuthStore((s) => s.accountType);
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  const redirectTo = options.redirectTo ?? '/(tabs)/home';
  const isAllowed = accountType != null && allowedList.includes(accountType);

  useEffect(() => {
    if (accountType != null && !allowedList.includes(accountType)) {
      router.replace(redirectTo as never);
    }
  }, [accountType, allowedList, redirectTo, router]);

  return { accountType, isAllowed, isChecking: accountType == null };
}
