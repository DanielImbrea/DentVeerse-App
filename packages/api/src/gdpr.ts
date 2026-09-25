import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type ConsentType = Database['public']['Tables']['consent_records']['Row']['consent_type'];

/** GDPR. See docs/11-gdpr-i18n.md Part A. */
export async function recordConsent(supabase: SupabaseClient<Database>, consentType: ConsentType, version: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('consent_records')
    .insert({ user_id: userData.user.id, consent_type: consentType, version })
    .select()
    .single();
}

export async function hasAcceptedCurrentTerms(supabase: SupabaseClient<Database>, currentVersion: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  const { data, error: queryError } = await supabase
    .from('consent_records')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('consent_type', 'terms')
    .eq('version', currentVersion)
    .maybeSingle();
  if (queryError) throw queryError;
  return data !== null;
}

/**
 * Requests a data export. Fulfillment (assembling the JSON bundle and
 * writing it to the private data-exports bucket) is performed by the
 * `gdpr-data-export` Edge Function (service-role only — see
 * supabase/functions/gdpr-data-export/index.ts) which this client call does
 * NOT trigger synchronously; the row is inserted with status='pending' and
 * a scheduled/polling job or an on-insert Edge Function hook processes it.
 * That hook is written (see the Edge Function file) but cannot be exercised
 * end-to-end without a running Supabase project.
 */
export async function requestDataExport(supabase: SupabaseClient<Database>) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase.from('data_export_requests').insert({ user_id: userData.user.id }).select().single();
}

export async function getMyExportRequests(supabase: SupabaseClient<Database>) {
  return supabase.from('data_export_requests').select('*').order('requested_at', { ascending: false });
}

/**
 * Retrieves a signed download URL for a completed export. FOUND MISSING
 * during this session's second security audit — see
 * supabase/functions/get-data-export-url/index.ts for the full story.
 */
export async function getDataExportUrl(supabase: SupabaseClient<Database>, requestId: string) {
  const { data, error } = await supabase.functions.invoke('get-data-export-url', { body: { request_id: requestId } });
  if (error) throw error;
  return data as { signed_url: string; expires_in: number };
}
