import { createSupabaseServerClient } from './supabaseServer';
import { createAdminClient } from './supabaseAdmin';

export class UnauthorizedError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * SECURITY FIX (this session) — THE single chokepoint for admin identity.
 *
 * Every admin Server Action in this app must call `requireAdmin()` FIRST,
 * before doing anything else, and use the returned `adminId` for both the
 * privileged operation and the `audit_logs` entry. This completely replaces
 * the previous pattern of trusting an `adminId`/`REPLACE_WITH_SESSION_ADMIN_ID`
 * hidden form field — that field no longer exists anywhere in this codebase
 * (see the diff across app/(dashboard)/**\/page.tsx).
 *
 * How it's secure: `createSupabaseServerClient()` reads the caller's session
 * from httpOnly cookies (never client-modifiable) and asks Supabase Auth
 * itself to verify it via `.auth.getUser()` — this makes a real network
 * round-trip to Supabase's Auth server to validate the JWT, it does not
 * just decode a client-supplied token blindly. Only after that identity is
 * confirmed do we check `admin_users` (via the service-role client, since
 * `admin_users` has no client-facing SELECT policy for non-admins to query
 * against their own id in a way that would let an unauthenticated caller
 * probe it) for a matching row. If either step fails, this throws
 * `UnauthorizedError` — every calling Server Action must let that
 * propagate (Next.js will render the nearest error boundary), not swallow
 * it and fall back to some default identity.
 */
export async function requireAdmin(): Promise<{ adminId: string; role: 'super_admin' | 'moderator' | 'support' }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const admin = createAdminClient();
  const { data: adminRow, error: adminError } = await admin
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    throw new UnauthorizedError('This account does not have admin access');
  }

  return { adminId: adminRow.id, role: adminRow.role };
}

/**
 * Role-gated variant — throws unless the verified admin has one of the
 * given roles. Use for financially-sensitive or destructive actions where
 * `support`-level access should not be sufficient (e.g., a future
 * subscription refund action, per docs/10-admin-panel.md §2's role
 * definitions — `super_admin` incl. financial actions, `moderator`
 * content/reports/verifications, `support` read-only-ish).
 */
export async function requireAdminRole(
  allowedRoles: Array<'super_admin' | 'moderator' | 'support'>
): Promise<{ adminId: string; role: 'super_admin' | 'moderator' | 'support' }> {
  const admin = await requireAdmin();
  if (!allowedRoles.includes(admin.role)) {
    throw new UnauthorizedError(`This action requires one of: ${allowedRoles.join(', ')}`);
  }
  return admin;
}
