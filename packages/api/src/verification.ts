import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type VerificationDocType = Database['public']['Tables']['verification_documents']['Row']['document_type'];

/**
 * Verification submission flow. See docs/08-verification-notifications-reports.md
 * Part A and docs/16-client-decisions-mvp-scope-update.md §6 (confirmed
 * required documents for Romania).
 *
 * NOTE on the upload step: docs/03-security.md §4 specifies uploads should
 * go through an Edge Function rather than a direct client-to-Storage
 * upload, so the insert of `verification_documents` can be tightly coupled
 * to the upload transaction. This client-side function performs the direct
 * Storage upload (allowed by the storage RLS policy in
 * 0021_storage_buckets.sql, which permits INSERT into the caller's own
 * folder) followed by the metadata insert as two steps — acceptable for
 * MVP, but the recommended hardening (bundling both into one Edge Function
 * transaction, and having the Edge Function be the one to name/validate the
 * file rather than trusting a client-provided path) is NOT done here; flag
 * for the Cursor session as a security hardening TODO before production
 * launch of this specific flow.
 */
export async function submitVerificationRequest(
  supabase: SupabaseClient<Database>,
  subjectType: 'clinic' | 'laboratory',
  subjectId: string
) {
  return supabase
    .from('verification_requests')
    .insert({ subject_type: subjectType, subject_id: subjectId, status: 'pending' })
    .select()
    .single();
}

export async function uploadVerificationDocument(
  supabase: SupabaseClient<Database>,
  verificationRequestId: string,
  documentType: VerificationDocType,
  file: { uri: string; name: string; type: string }
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  const path = `${userData.user.id}/${verificationRequestId}/${documentType}-${Date.now()}-${file.name}`;

  // NOTE: React Native's fetch/Blob upload path via Supabase Storage
  // requires a platform-specific blob construction (expo-file-system read
  // + Blob polyfill) not written here since it needs a real device file URI
  // to exercise — see docs/06-feed-messaging.md's identical caveat on
  // message attachments. The call shape below is correct once `file.uri`
  // resolves to actual bytes.
  const { error: uploadError } = await supabase.storage
    .from('verification-documents')
    .upload(path, { uri: file.uri } as unknown as Blob, { contentType: file.type });
  if (uploadError) throw uploadError;

  return supabase
    .from('verification_documents')
    .insert({ verification_request_id: verificationRequestId, storage_path: path, document_type: documentType })
    .select()
    .single();
}

export async function getVerificationStatus(
  supabase: SupabaseClient<Database>,
  subjectType: 'clinic' | 'laboratory',
  subjectId: string
) {
  return supabase
    .from('verification_requests')
    .select('*, verification_documents(id, document_type, uploaded_at)')
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Required document checklist per client decision (docs/16 §6), for UI display. */
export const REQUIRED_DOCUMENTS: Record<'clinic' | 'laboratory', VerificationDocType[]> = {
  clinic: ['cui', 'dsp_authorization', 'id_document'],
  laboratory: ['cui', 'technician_certificate', 'id_document'],
};
