import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type FavoriteTargetType = Database['public']['Tables']['favorites']['Row']['target_type'];

/** Favorites. See docs/07-opportunities-follow-reviews.md Part B. */
export async function addFavorite(supabase: SupabaseClient<Database>, targetType: FavoriteTargetType, targetId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase.from('favorites').insert({ user_id: userData.user.id, target_type: targetType, target_id: targetId });
}

export async function removeFavorite(supabase: SupabaseClient<Database>, targetType: FavoriteTargetType, targetId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase
    .from('favorites')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId);
}

export async function listMyFavorites(supabase: SupabaseClient<Database>, targetType?: FavoriteTargetType) {
  let query = supabase.from('favorites').select('*').order('created_at', { ascending: false });
  if (targetType) query = query.eq('target_type', targetType);
  return query;
}
