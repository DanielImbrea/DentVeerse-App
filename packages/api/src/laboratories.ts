import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type LaboratoryInsert = Database['public']['Tables']['laboratories']['Insert'];
type LaboratoryUpdate = Database['public']['Tables']['laboratories']['Update'];

/** Laboratory profile CRUD — mirrors clinics.ts. See docs/02-database.md §1. */
export async function createLaboratory(
  supabase: SupabaseClient<Database>,
  input: Omit<LaboratoryInsert, 'owner_user_id'>
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('laboratories')
    .insert({ ...input, owner_user_id: userData.user.id })
    .select()
    .single();
}

export async function updateLaboratory(
  supabase: SupabaseClient<Database>,
  laboratoryId: string,
  patch: LaboratoryUpdate
) {
  return supabase.from('laboratories').update(patch).eq('id', laboratoryId).select().single();
}

export async function getLaboratoryBySlug(supabase: SupabaseClient<Database>, slug: string) {
  return supabase.from('laboratories').select('*').eq('slug', slug).single();
}

export async function getLaboratoryById(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('laboratories').select('*').eq('id', id).single();
}

export async function listMyLaboratories(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('laboratory_members')
    .select('role, laboratories(*)')
    .eq('user_id', userData.user.id);
}

export async function setLaboratoryLocation(
  supabase: SupabaseClient<Database>,
  laboratoryId: string,
  lat: number,
  lng: number
) {
  return supabase.rpc('set_laboratory_location' as never, {
    p_laboratory_id: laboratoryId,
    p_lat: lat,
    p_lng: lng,
  } as never);
}

export interface NearbyLaboratoriesParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  city?: string;
  verifiedOnly?: boolean;
  openForCollaborationOnly?: boolean;
  limit?: number;
}

/**
 * Laboratory radius search — mirrors `findNearbyClinics` in clinics.ts,
 * calling the `nearby_laboratories` RPC (supabase/migrations/0022). Added
 * this session to wire laboratory markers onto the map, which previously
 * only queried clinics.
 */
export async function findNearbyLaboratories(supabase: SupabaseClient<Database>, params: NearbyLaboratoriesParams) {
  return supabase.rpc('nearby_laboratories' as never, {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_m: params.radiusMeters ?? 15000,
    p_city: params.city ?? null,
    p_verified_only: params.verifiedOnly ?? false,
    p_open_for_collaboration_only: params.openForCollaborationOnly ?? false,
    p_limit: params.limit ?? 50,
  } as never);
}
