// admin-verification-document-url
//
// The ONLY path by which a verification document can be viewed, per
// docs/03-security.md §4 ("verification documents must be visible only to
// platform administrators") — checks admin_users, mints a signed URL via
// service-role, and writes an audit_logs row for every view. This function
// bypasses the (deliberately absent) client SELECT policy on
// verification_documents entirely, by design.
//
// STATUS: written, NOT executed — same caveat as get-message-attachment-url.

import { createServiceRoleClient, getCallerUserId, jsonResponse, errorResponse } from '../_shared/client.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — long enough for an admin to review, short enough to limit exposure

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const callerId = await getCallerUserId(req);
    const admin = createServiceRoleClient();

    const { data: adminRow, error: adminError } = await admin
      .from('admin_users')
      .select('id, role')
      .eq('id', callerId)
      .maybeSingle();

    if (adminError) return errorResponse(adminError.message, 500);
    if (!adminRow) return errorResponse('Not authorized — admin access required', 403);

    // RATE LIMITED (closes gap documented in 0027_rate_limiting.sql) —
    // generous limit appropriate for a legitimate admin reviewing many
    // verification documents in one session.
    const allowed = await checkRateLimit(callerId, 'admin-verification-document-url', 100, 3600);
    if (!allowed) {
      return errorResponse('Too many document view requests. Please wait before continuing.', 429);
    }

    const { document_id } = await req.json();
    if (!document_id) return errorResponse('document_id is required');

    const { data: doc, error: docError } = await admin
      .from('verification_documents')
      .select('id, storage_path, document_type, verification_request_id')
      .eq('id', document_id)
      .single();

    if (docError || !doc) return errorResponse('Document not found', 404);

    const { data: signedUrlData, error: signError } = await admin.storage
      .from('verification-documents')
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signedUrlData) return errorResponse(signError?.message ?? 'Failed to sign URL', 500);

    // MANDATORY audit log entry — every document view is recorded, per
    // docs/03-security.md §4 and docs/10-admin-panel.md.
    const { error: auditError } = await admin.from('audit_logs').insert({
      admin_id: callerId,
      action: 'view_verification_document',
      target_type: 'verification_documents',
      target_id: doc.id,
      after: { document_type: doc.document_type },
    });
    if (auditError) {
      // Fail closed: if we can't record the audit trail, don't hand out the
      // document either — this is a deliberate choice, not an oversight.
      return errorResponse('Failed to record audit log; access denied as a precaution', 500);
    }

    return jsonResponse({ signed_url: signedUrlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
