// get-data-export-url
//
// FOUND DURING THIS SESSION'S SECOND SECURITY AUDIT: the data-exports
// bucket correctly has no client-facing SELECT policy (see
// supabase/migrations/0021_storage_buckets.sql), and
// gdpr-data-export/index.ts correctly writes the finished bundle there —
// but nothing ever existed to let the REQUESTING USER actually retrieve
// it. The export was reachable by nobody, including its rightful owner.
// This function closes that gap: verifies the caller owns the
// `data_export_requests` row (not just any authenticated user), confirms
// it's `status='ready'`, and mints a short-lived signed URL — mirroring
// the exact same "verify ownership/authorization, then service-role signs
// a URL" pattern already used by get-message-attachment-url and
// admin-verification-document-url.
//
// STATUS: written, NOT executed.

import { createServiceRoleClient, getCallerUserId, jsonResponse, errorResponse } from '../_shared/client.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes — long enough to start a download, short enough to limit exposure

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const callerId = await getCallerUserId(req);

    // RATE LIMITED (closes gap documented in 0027_rate_limiting.sql).
    const allowed = await checkRateLimit(callerId, 'get-data-export-url', 20, 3600);
    if (!allowed) {
      return errorResponse('Too many requests. Please wait before trying again.', 429);
    }

    const { request_id } = await req.json();
    if (!request_id) return errorResponse('request_id is required');

    const admin = createServiceRoleClient();

    const { data: exportRequest, error: fetchError } = await admin
      .from('data_export_requests')
      .select('id, user_id, status, file_storage_path, expires_at')
      .eq('id', request_id)
      .single();

    if (fetchError || !exportRequest) return errorResponse('Export request not found', 404);

    // Ownership check — this is the exact check that was previously
    // missing entirely (there was no endpoint at all, so there was nothing
    // to check; now that one exists, it must check this before anything
    // else, matching the RLS-equivalent restriction already correctly
    // applied to the table row itself).
    if (exportRequest.user_id !== callerId) {
      return errorResponse('Not authorized to access this export', 403);
    }

    if (exportRequest.status !== 'ready' || !exportRequest.file_storage_path) {
      return errorResponse('Export is not ready yet', 409);
    }

    if (exportRequest.expires_at && new Date(exportRequest.expires_at) < new Date()) {
      return errorResponse('This export has expired. Please request a new one.', 410);
    }

    const { data: signedUrlData, error: signError } = await admin.storage
      .from('data-exports')
      .createSignedUrl(exportRequest.file_storage_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signedUrlData) return errorResponse(signError?.message ?? 'Failed to sign URL', 500);

    return jsonResponse({ signed_url: signedUrlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
