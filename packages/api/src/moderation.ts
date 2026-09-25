import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type ReportTargetType = Database['public']['Tables']['reports']['Row']['target_type'];
type ReportReason = Database['public']['Tables']['reports']['Row']['reason'];

/**
 * Blocking. See docs/16-client-decisions-mvp-scope-update.md §4 — confirmed
 * full-hide across feed/search/map, enforced by `is_blocked_by_viewer()`
 * inside the RLS policies themselves (supabase/migrations/0016, applied in
 * 0018-0020). No client-side filtering is required for that part; blocking
 * a user takes effect immediately on the next query because it's enforced
 * at the database layer.
 */
export async function blockUser(supabase: SupabaseClient<Database>, blockedUserId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase.from('blocked_users').insert({ blocker_user_id: userData.user.id, blocked_user_id: blockedUserId });
}

export async function unblockUser(supabase: SupabaseClient<Database>, blockedUserId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_user_id', userData.user.id)
    .eq('blocked_user_id', blockedUserId);
}

export async function listBlockedUsers(supabase: SupabaseClient<Database>) {
  return supabase.from('blocked_users').select('*').order('created_at', { ascending: false });
}

/** Reporting. See docs/08-verification-notifications-reports.md Part C. */
export async function submitReport(
  supabase: SupabaseClient<Database>,
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  note?: string,
  contentSnapshot?: string
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('reports')
    .insert({
      reporter_user_id: userData.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      note,
      content_snapshot: contentSnapshot,
    })
    .select()
    .single();
}

export async function listMyReports(supabase: SupabaseClient<Database>) {
  return supabase.from('reports').select('*').order('created_at', { ascending: false });
}
