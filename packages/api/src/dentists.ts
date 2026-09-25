import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type DentistInsert = Database['public']['Tables']['dentists']['Insert'];
type DentistUpdate = Database['public']['Tables']['dentists']['Update'];

/** Clinic team management. See client spec §4, docs/02-database.md §1. */
export async function addDentist(supabase: SupabaseClient<Database>, input: DentistInsert) {
  return supabase.from('dentists').insert(input).select().single();
}

export async function updateDentist(supabase: SupabaseClient<Database>, dentistId: string, patch: DentistUpdate) {
  return supabase.from('dentists').update(patch).eq('id', dentistId).select().single();
}

export async function removeDentist(supabase: SupabaseClient<Database>, dentistId: string) {
  // Soft delete — sets deleted_at rather than a hard DELETE, consistent with
  // the rest of the schema's moderation/audit-trail conventions.
  return supabase
    .from('dentists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dentistId);
}

export async function listClinicDentists(supabase: SupabaseClient<Database>, clinicId: string) {
  return supabase
    .from('dentists')
    .select('*, specializations(label_ro, label_en)')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });
}
