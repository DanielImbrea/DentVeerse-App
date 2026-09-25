// get-message-attachment-url
//
// Verifies the caller is a member of the conversation that owns the
// requested attachment, then mints a short-lived signed URL via the
// service-role key. This exists because message_attachments' Storage
// objects have no client-facing SELECT policy — access must be gated by
// conversation membership, which is a join across tables, not expressible
// as a simple Storage RLS predicate. See docs/06-feed-messaging.md
// "Attachments" and packages/api/src/messaging.ts `getSignedAttachmentUrl`.
//
// STATUS: written, NOT executed. No network access in this environment to
// deploy/invoke Supabase Edge Functions. Deploy with
// `supabase functions deploy get-message-attachment-url` and test against a
// real conversation locally in Cursor before relying on it.

import { createServiceRoleClient, getCallerUserId, jsonResponse, errorResponse } from '../_shared/client.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const callerId = await getCallerUserId(req);

    // RATE LIMITED (closes gap documented in 0027_rate_limiting.sql):
    // generous limit since a chat screen may legitimately request several
    // attachment URLs in quick succession while scrolling.
    const allowed = await checkRateLimit(callerId, 'get-message-attachment-url', 60, 60);
    if (!allowed) {
      return errorResponse('Too many requests. Please slow down.', 429);
    }

    const { storage_path } = await req.json();
    if (!storage_path || typeof storage_path !== 'string') {
      return errorResponse('storage_path is required');
    }

    const admin = createServiceRoleClient();

    // Verify the caller is a member of the conversation owning this attachment.
    const { data: attachment, error: attachmentError } = await admin
      .from('message_attachments')
      .select('id, message_id, messages(conversation_id)')
      .eq('storage_path', storage_path)
      .single();

    if (attachmentError || !attachment) return errorResponse('Attachment not found', 404);

    const conversationId = (attachment as unknown as { messages: { conversation_id: string } }).messages
      ?.conversation_id;

    const { data: membership, error: membershipError } = await admin
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (membershipError) return errorResponse(membershipError.message, 500);
    if (!membership) return errorResponse('Not a member of this conversation', 403);

    const { data: signedUrlData, error: signError } = await admin.storage
      .from('message-attachments')
      .createSignedUrl(storage_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signedUrlData) return errorResponse(signError?.message ?? 'Failed to sign URL', 500);

    return jsonResponse({ signed_url: signedUrlData.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
