import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import type { PostReactionType } from '@dental/utils';

/** Post reactions + legacy like helpers. See migration 0032. */

export type { PostReactionType };

export async function setPostReaction(
  supabase: SupabaseClient<Database>,
  postId: string,
  reactionType: PostReactionType
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase.from('likes').upsert(
    {
      user_id: userData.user.id,
      target_type: 'post',
      target_id: postId,
      reaction_type: reactionType,
    },
    { onConflict: 'user_id,target_type,target_id' }
  );
}

export async function removePostReaction(supabase: SupabaseClient<Database>, postId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('likes')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('target_type', 'post')
    .eq('target_id', postId);
}

export async function fetchMyPostReactions(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: new Map<string, PostReactionType>(), error: userError ?? new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('likes')
    .select('target_id, reaction_type')
    .eq('user_id', userData.user.id)
    .eq('target_type', 'post');

  if (error) return { data: new Map<string, PostReactionType>(), error };

  const map = new Map<string, PostReactionType>();
  for (const row of data ?? []) {
    map.set(row.target_id, row.reaction_type as PostReactionType);
  }
  return { data: map, error: null };
}

export async function fetchPostReactionBreakdown(supabase: SupabaseClient<Database>, postId: string) {
  return supabase.rpc('get_post_reaction_breakdown', { p_post_id: postId });
}

export async function getPostEngagementState(supabase: SupabaseClient<Database>, postId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return { reaction: null as PostReactionType | null, saved: false, error };
  }

  const [likeRes, saveRes] = await Promise.all([
    supabase
      .from('likes')
      .select('id, reaction_type')
      .eq('user_id', userData.user.id)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .maybeSingle(),
    supabase.from('saves').select('id').eq('user_id', userData.user.id).eq('post_id', postId).maybeSingle(),
  ]);

  return {
    reaction: (likeRes.data?.reaction_type as PostReactionType | undefined) ?? null,
    liked: !!likeRes.data,
    saved: !!saveRes.data,
    error: null,
  };
}
