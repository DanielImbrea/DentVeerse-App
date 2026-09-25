import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

/**
 * Reviews. See docs/07-opportunities-follow-reviews.md Part C. The unique
 * constraint (clinic_id, patient_user_id) and the rating-recalculation
 * trigger are enforced server-side (supabase/migrations/0008_reviews.sql) —
 * a duplicate INSERT throws a Postgres unique-violation, surface that as
 * "you've already reviewed this clinic," not a generic error.
 */
export async function submitReview(supabase: SupabaseClient<Database>, input: Omit<ReviewInsert, 'patient_user_id'>) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('reviews')
    .insert({ ...input, patient_user_id: userData.user.id })
    .select()
    .single();
}

export async function updateReview(supabase: SupabaseClient<Database>, id: string, patch: Partial<ReviewInsert>) {
  // RLS only allows this within 48h of creation (or by an admin) — see
  // supabase/migrations/0020_rls_policies_part3.sql. A rejected update
  // after the edit window throws; surface as "reviews can only be edited
  // within 48 hours of posting."
  return supabase.from('reviews').update(patch).eq('id', id).select().single();
}

/**
 * Hard-deletes the review per the client's confirmed GDPR approach
 * (docs/16-client-decisions-mvp-scope-update.md §7) — the AFTER DELETE
 * trigger on public.reviews recalculates clinics.rating_avg/rating_count
 * without it automatically.
 */
export async function deleteReview(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('reviews').delete().eq('id', id);
}

export async function listClinicReviews(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  params: { cursor?: string | null; pageSize?: number } = {}
) {
  let query = supabase
    .from('reviews')
    .select('*, public_profiles(first_name, last_name, avatar_url)')
    .eq('clinic_id', clinicId)
    .eq('status', 'visible')
    .order('created_at', { ascending: false })
    .limit(params.pageSize ?? 20);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  return query;
}

export async function getMyReviewForClinic(supabase: SupabaseClient<Database>, clinicId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('reviews')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('patient_user_id', userData.user.id)
    .maybeSingle();
}
