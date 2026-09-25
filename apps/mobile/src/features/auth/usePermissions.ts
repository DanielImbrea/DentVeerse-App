import { useMemo } from 'react';
import type { Permissions } from '@dental/types';
import { useAuthStore } from '../../stores/authStore';

/**
 * The single source of truth for role-based UI affordances on the client.
 * Every screen/component that needs to know "can this account do X" reads
 * from this hook rather than re-deriving the check inline — see
 * docs/04-mobile.md §3 and docs/15-ai-agent-instructions.md rule 7
 * (avoid duplicated business logic).
 *
 * IMPORTANT: this only controls what the UI *shows*. The authoritative
 * enforcement is always server-side RLS (docs/03-security.md) — these checks
 * exist for UX, not security.
 */
export function usePermissions(): Permissions {
  const accountType = useAuthStore((s) => s.accountType);

  return useMemo(() => {
    const isOrg = accountType === 'clinic' || accountType === 'laboratory';
    return {
      canPost: isOrg,
      canManageTeam: accountType === 'clinic',
      canEditServices: isOrg,
      canRespondToOpportunity: isOrg,
      canCreateOpportunity: isOrg,
      canReview: accountType === 'patient',
    };
  }, [accountType]);
}
