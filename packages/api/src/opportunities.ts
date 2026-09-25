import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];

/**
 * Opportunities / collaboration workflow. See docs/07-opportunities-follow-reviews.md
 * Part A. Multi-accept confirmed by client (docs/16 §2) — no auto-close on
 * first accept; the max-5-active-per-account limit is enforced server-side
 * by a trigger (supabase/migrations/0012_platform_limits.sql), so the
 * INSERT below will throw if the org already has 5 open opportunities —
 * surface that as "you've reached the maximum of 5 active opportunities."
 */
export async function createOpportunity(supabase: SupabaseClient<Database>, input: OpportunityInsert) {
  return supabase.from('opportunities').insert(input).select().single();
}

export async function updateOpportunity(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<OpportunityInsert>
) {
  return supabase.from('opportunities').update(patch).eq('id', id).select().single();
}

export async function closeOpportunity(supabase: SupabaseClient<Database>, id: string, status: 'closed' | 'filled' | 'cancelled') {
  return supabase.from('opportunities').update({ status }).eq('id', id).select().single();
}

export async function listOpenOpportunities(
  supabase: SupabaseClient<Database>,
  filters: { city?: string; specializationId?: string; cursor?: string | null; pageSize?: number } = {}
) {
  let query = supabase
    .from('opportunities')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(filters.pageSize ?? 20);

  if (filters.city) query = query.eq('city', filters.city);
  if (filters.specializationId) query = query.eq('specialization_id', filters.specializationId);
  if (filters.cursor) query = query.lt('created_at', filters.cursor);
  return query;
}

export async function listOrgOpportunities(
  supabase: SupabaseClient<Database>,
  authorType: 'clinic' | 'laboratory',
  authorId: string
) {
  return supabase
    .from('opportunities')
    .select('*')
    .eq('author_type', authorType)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
}

export async function registerInterest(
  supabase: SupabaseClient<Database>,
  opportunityId: string,
  responderType: 'clinic' | 'laboratory',
  responderId: string
) {
  return supabase
    .from('opportunity_interests')
    .insert({ opportunity_id: opportunityId, responder_type: responderType, responder_id: responderId })
    .select()
    .single();
}

export async function withdrawInterest(supabase: SupabaseClient<Database>, interestId: string) {
  return supabase.from('opportunity_interests').update({ status: 'withdrawn' }).eq('id', interestId);
}

/**
 * Accepting an interest both flips its status AND must create/reuse a
 * conversation (docs/07 Part A workflow diagram). This two-step operation
 * is done as: (1) update status, (2) call create_or_get_conversation RPC,
 * (3) persist the returned conversation_id back onto the interest row —
 * bundled into one client-side function so callers never do it partially.
 */
export async function acceptInterest(
  supabase: SupabaseClient<Database>,
  interestId: string,
  opponent: {
    otherUserId: string;
    myActingAsType: 'clinic' | 'laboratory';
    myActingAsId: string;
    otherActingAsType: 'clinic' | 'laboratory';
    otherActingAsId: string;
  }
) {
  const { error: updateError } = await supabase
    .from('opportunity_interests')
    .update({ status: 'accepted' })
    .eq('id', interestId);
  if (updateError) throw updateError;

  const { data: conversationId, error: rpcError } = await supabase.rpc('create_or_get_conversation', {
    p_other_user_id: opponent.otherUserId,
    p_my_acting_as_type: opponent.myActingAsType,
    p_my_acting_as_id: opponent.myActingAsId,
    p_other_acting_as_type: opponent.otherActingAsType,
    p_other_acting_as_id: opponent.otherActingAsId,
    p_origin: 'opportunity',
  });
  if (rpcError) throw rpcError;

  return supabase
    .from('opportunity_interests')
    .update({ conversation_id: conversationId as unknown as string })
    .eq('id', interestId)
    .select()
    .single();
}

export async function rejectInterest(supabase: SupabaseClient<Database>, interestId: string) {
  return supabase.from('opportunity_interests').update({ status: 'rejected' }).eq('id', interestId);
}

export async function listInterestsForOpportunity(supabase: SupabaseClient<Database>, opportunityId: string) {
  return supabase
    .from('opportunity_interests')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: true });
}
