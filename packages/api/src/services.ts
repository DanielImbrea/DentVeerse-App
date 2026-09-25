import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type ClinicServiceInsert = Database['public']['Tables']['clinic_services']['Insert'];
type LaboratoryServiceInsert = Database['public']['Tables']['laboratory_services']['Insert'];

/** Services catalog + instance CRUD. See client spec §5, §8; docs/02-database.md §2. */
export async function listServiceCatalog(
  supabase: SupabaseClient<Database>,
  category?: 'clinic' | 'laboratory'
) {
  let query = supabase.from('services').select('*').eq('active', true);
  if (category) query = query.in('category', [category, 'both']);
  return query.order('label_ro', { ascending: true });
}

export async function addClinicService(supabase: SupabaseClient<Database>, input: ClinicServiceInsert) {
  return supabase.from('clinic_services').insert(input).select().single();
}

export async function updateClinicService(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<ClinicServiceInsert>
) {
  return supabase.from('clinic_services').update(patch).eq('id', id).select().single();
}

export async function removeClinicService(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('clinic_services').delete().eq('id', id);
}

export async function listClinicServices(supabase: SupabaseClient<Database>, clinicId: string) {
  return supabase
    .from('clinic_services')
    .select('*, services(key, label_ro, label_en, category)')
    .eq('clinic_id', clinicId)
    .order('display_order', { ascending: true });
}

export async function addLaboratoryService(supabase: SupabaseClient<Database>, input: LaboratoryServiceInsert) {
  return supabase.from('laboratory_services').insert(input).select().single();
}

export async function updateLaboratoryService(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<LaboratoryServiceInsert>
) {
  return supabase.from('laboratory_services').update(patch).eq('id', id).select().single();
}

export async function removeLaboratoryService(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('laboratory_services').delete().eq('id', id);
}

export async function listLaboratoryServices(supabase: SupabaseClient<Database>, laboratoryId: string) {
  return supabase
    .from('laboratory_services')
    .select('*, services(key, label_ro, label_en, category)')
    .eq('laboratory_id', laboratoryId)
    .order('display_order', { ascending: true });
}
