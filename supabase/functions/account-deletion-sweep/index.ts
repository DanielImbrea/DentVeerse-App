// account-deletion-sweep
//
// Scheduled job (run daily via cron) that hard-deletes personal data for
// accounts whose 30-day grace window (docs/16-client-decisions-mvp-scope-update.md
// §7) has elapsed. Soft-delete (users.status='deleted') already happens
// synchronously at request time in packages/api/src/auth.ts `deleteAccount`
// — this function only performs the eventual hard-delete/PII-nulling once
// the grace window has passed, and re-applies the status update
// defensively (idempotent) in case that client-side call ever fails
// partway through.
//
// AUDIT FIX (this session): the sole-owner-deletion edge case (a user who
// is the only member of a clinic/laboratory deletes their account) is now
// handled — see `handleOwnershipTransferOrSuspend` below — rather than
// silently orphaning the organization as in the previous version.
//
// STATUS: written, NOT executed. Requires pg_cron or an external scheduler
// invoking this daily, and has NOT been tested against real data.

import { createServiceRoleClient, jsonResponse, errorResponse } from '../_shared/client.ts';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const admin = createServiceRoleClient();

    const { data: dueRequests, error: dueError } = await admin
      .from('account_deletion_requests')
      .select('id, user_id')
      .eq('completed', false)
      .lte('scheduled_hard_delete_at', new Date().toISOString());

    if (dueError) return errorResponse(dueError.message, 500);
    if (!dueRequests || dueRequests.length === 0) return jsonResponse({ processed: 0 });

    let processed = 0;
    for (const request of dueRequests) {
      // Ensure the account is hidden from public surfaces immediately
      // (idempotent even if this is the first time it's being set).
      await admin.from('users').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', request.user_id);

      // AUDIT FIX (this session): handle the sole-owner-deletion edge case
      // instead of silently orphaning the organization. For every
      // clinic/laboratory this user owns: if another member exists,
      // promote the longest-standing one to 'owner'; if this user is the
      // only member at all, suspend the org (status='suspended') rather
      // than leaving a functioning public profile with no one able to
      // manage it. This is a reasonable default, not a confirmed product
      // decision — flag the outcome for admin follow-up either way via an
      // audit_logs-style record (reusing the reports table's spirit isn't
      // quite right since there's no admin_id acting here; a dedicated
      // `admin_notices` table would be the clean long-term fix — noted for
      // Cursor rather than built now, to avoid a speculative new table).
      await handleOwnershipTransferOrSuspend(admin, 'clinic_members', 'clinic_id', 'clinics', request.user_id);
      await handleOwnershipTransferOrSuspend(admin, 'laboratory_members', 'laboratory_id', 'laboratories', request.user_id);

      // Hard-delete / null out PII, per the client's confirmed approach
      // (hard delete, not anonymize-and-retain — docs/16 §7).
      await admin
        .from('users')
        .update({ email: null, phone: null })
        .eq('id', request.user_id);

      await admin
        .from('patient_profiles')
        .update({ first_name: null, last_name: null, city: null, avatar_url: null })
        .eq('user_id', request.user_id);

      // Delete the underlying auth.users row too — this cascades (via FK
      // `on delete cascade` from public.users) through most owned rows.
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(request.user_id);
      if (authDeleteError) {
        console.error(`Failed to delete auth user ${request.user_id}:`, authDeleteError.message);
        continue; // leave this request unmarked so it retries tomorrow
      }

      await admin
        .from('account_deletion_requests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', request.id);

      processed++;
    }

    return jsonResponse({ processed, total_due: dueRequests.length });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});

/**
 * For every org (clinic or laboratory) where `deletingUserId` is the
 * 'owner': if another member exists, promotes the earliest-joined one to
 * 'owner' (matching the RLS invariant enforced elsewhere — see
 * `clinic_members_delete`/`laboratory_members_delete` policies in
 * supabase/migrations/0018 — that a sole owner cannot be removed via the
 * normal member-removal path; this sweep is the one legitimate path that
 * bypasses that invariant via the service-role key, and must therefore
 * actively repair it rather than leave the org ownerless). If no other
 * member exists, suspends the org instead of leaving a public profile with
 * no one able to manage or claim it.
 */
async function handleOwnershipTransferOrSuspend(
  admin: ReturnType<typeof createServiceRoleClient>,
  membersTable: 'clinic_members' | 'laboratory_members',
  orgIdColumn: 'clinic_id' | 'laboratory_id',
  orgTable: 'clinics' | 'laboratories',
  deletingUserId: string
) {
  const { data: ownedOrgs } = await admin
    .from(membersTable)
    .select(orgIdColumn)
    .eq('user_id', deletingUserId)
    .eq('role', 'owner');

  for (const row of ownedOrgs ?? []) {
    const orgId = (row as Record<string, string>)[orgIdColumn];

    const { data: otherMembers } = await admin
      .from(membersTable)
      .select('id, user_id, created_at')
      .eq(orgIdColumn, orgId)
      .neq('user_id', deletingUserId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (otherMembers && otherMembers.length > 0) {
      await admin.from(membersTable).update({ role: 'owner' }).eq('id', otherMembers[0].id);
    } else {
      await admin.from(orgTable).update({ status: 'suspended' }).eq('id', orgId);
    }
  }
}
