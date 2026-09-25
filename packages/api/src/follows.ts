import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, OrgType } from '@dental/types';

/**
 * Example of the shared query-function convention: one typed function per
 * operation, reused by every app (mobile/web/admin) rather than each app
 * writing its own ad hoc `.from('follows')...` call. See
 * docs/15-ai-agent-instructions.md rule 5 ("reuse existing components...
 * check the relevant api.ts before writing a new query function").
 *
 * Follow-list visibility is fully public per client decision — see
 * docs/16-client-decisions-mvp-scope-update.md §1 — so this read has no
 * additional client-side filtering beyond what RLS already allows.
 */

export type FollowTargetType = 'clinic' | 'laboratory' | 'dentist';

export async function follow(
  supabase: SupabaseClient<Database>,
  targetType: FollowTargetType,
  targetId: string
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('follows')
    .insert({
      follower_user_id: userData.user.id,
      target_type: targetType,
      target_id: targetId,
    })
    .select()
    .single();
}

export async function unfollow(
  supabase: SupabaseClient<Database>,
  targetType: FollowTargetType,
  targetId: string
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('follows')
    .delete()
    .eq('follower_user_id', userData.user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId);
}

export async function listFollowers(
  supabase: SupabaseClient<Database>,
  targetType: FollowTargetType,
  targetId: string
) {
  // Public read — no auth required, per confirmed public follow-list visibility.
  return supabase
    .from('follows')
    .select('follower_user_id, created_at')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
}

export type { OrgType };
