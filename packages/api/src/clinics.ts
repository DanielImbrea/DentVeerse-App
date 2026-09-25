import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type ClinicInsert = Database['public']['Tables']['clinics']['Insert'];
type ClinicUpdate = Database['public']['Tables']['clinics']['Update'];

/**
 * Clinic profile CRUD. See docs/02-database.md §1 and docs/03-security.md §2
 * (RLS: public read of active clinics, owner_user_id-gated insert, manager
 * write). owner_user_id is added server-side from the authenticated user's
 * id, never trusted from client input, per the RLS insert policy requiring
 * owner_user_id = auth.uid() — but we set it explicitly here too so a
 * missing/incorrect id fails fast client-side with a clear error instead of
 * only failing opaquely at the RLS layer.
 */
export async function createClinic(supabase: SupabaseClient<Database>, input: Omit<ClinicInsert, 'owner_user_id'>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('clinics')
    .insert({ ...input, owner_user_id: userData.user.id })
    .select()
    .single();
}

export async function updateClinic(supabase: SupabaseClient<Database>, clinicId: string, patch: ClinicUpdate) {
  return supabase.from('clinics').update(patch).eq('id', clinicId).select().single();
}

export async function getClinicBySlug(supabase: SupabaseClient<Database>, slug: string) {
  return supabase.from('clinics').select('*').eq('slug', slug).single();
}

export async function getClinicById(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('clinics').select('*').eq('id', id).single();
}

export async function listMyClinics(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('clinic_members')
    .select('role, clinics(*)')
    .eq('user_id', userData.user.id);
}

/**
 * Sets the clinic's location. Coordinates should come from a geocoding call
 * against the entered address (Google Maps Geocoding API) — that geocoding
 * step is NOT implemented here since it requires a live network call to
 * Google's API, which cannot be exercised in this offline environment. Wire
 * this to an Edge Function (`geocode-address`, see
 * supabase/functions/README.md) that calls Google Geocoding server-side
 * (keeping the API key server-only) and returns { lat, lng } for this
 * function to persist via PostGIS's ST_MakePoint.
 */
export async function setClinicLocation(
  supabase: SupabaseClient<Database>,
  clinicId: string,
  lat: number,
  lng: number
) {
  // PostGIS geography(Point) columns aren't directly settable via the
  // PostgREST filter builder with a plain object — use an RPC wrapping
  // `ST_MakePoint(lng, lat)::geography`. See
  // supabase/functions/README.md for the `set-clinic-location` RPC/function
  // that should be added in Phase 5 to perform this server-side.
  return supabase.rpc('set_clinic_location' as never, {
    p_clinic_id: clinicId,
    p_lat: lat,
    p_lng: lng,
  } as never);
}

export interface NearbyClinicsParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  city?: string;
  specializationId?: string;
  verifiedOnly?: boolean;
  openForCollaborationOnly?: boolean;
  limit?: number;
}

/**
 * Radius search — requires the `nearby_clinics` RPC (PostGIS ST_DWithin,
 * see docs/05-search-map.md §2) to be added as a migration/function; the
 * client-side call is defined here so screens can be wired against a stable
 * signature while that RPC is finished. See
 * supabase/migrations/0022_geo_search_functions.sql (added below).
 */
export async function findNearbyClinics(supabase: SupabaseClient<Database>, params: NearbyClinicsParams) {
  return supabase.rpc('nearby_clinics' as never, {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_m: params.radiusMeters ?? 15000,
    p_city: params.city ?? null,
    p_specialization_id: params.specializationId ?? null,
    p_verified_only: params.verifiedOnly ?? false,
    p_open_for_collaboration_only: params.openForCollaborationOnly ?? false,
    p_limit: params.limit ?? 50,
  } as never);
}
