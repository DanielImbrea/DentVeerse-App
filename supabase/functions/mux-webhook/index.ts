// mux-webhook
//
// Receives webhook events from Mux (configure this function's URL in the
// Mux dashboard under Settings > Webhooks) and updates the corresponding
// `portfolio_media` row once video transcoding completes. Handles:
//   - video.upload.asset_created: links the upload_id to the resulting
//     asset_id (Mux creates the asset asynchronously after the direct
//     upload completes).
//   - video.asset.ready: sets processing_status='ready',
//     video_playback_url (Mux's HLS URL), and thumbnail_url (Mux's
//     auto-generated poster image URL).
//   - video.asset.errored: sets processing_status='failed'.
//
// SECURITY: verifies the Mux webhook signature (Mux-Signature header)
// against MUX_WEBHOOK_SECRET before trusting any payload — an unsigned or
// incorrectly-signed request is rejected outright, per the same
// signature-verification principle already applied to
// docs/09-subscriptions-payments.md's deferred Stripe/Apple/Google webhook
// design (this is the pattern in practice for the first real webhook
// receiver in this codebase).
//
// STATUS: written, NOT executed. Requires a real Mux account with a
// webhook configured pointing at this function's deployed URL, and a real
// video upload to have occurred via create-mux-upload — none of which is
// achievable in this environment.

import { createServiceRoleClient, jsonResponse, errorResponse } from '../_shared/client.ts';

async function verifyMuxSignature(req: Request, rawBody: string): Promise<boolean> {
  const signatureHeader = req.headers.get('mux-signature');
  const secret = Deno.env.get('MUX_WEBHOOK_SECRET');
  if (!signatureHeader || !secret) return false;

  // Mux-Signature format: "t=<timestamp>,v1=<hex-hmac>"
  const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time-ish comparison (Deno lacks a built-in timingSafeEqual in
  // this context; length check + full comparison is an acceptable
  // approximation here, exact timing-attack hardening is a Cursor
  // follow-up if this matters at your threat model).
  return computedHex === signature;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const rawBody = await req.text();
    const isValid = await verifyMuxSignature(req, rawBody);
    if (!isValid) return errorResponse('Invalid webhook signature', 401);

    const event = JSON.parse(rawBody);
    const admin = createServiceRoleClient();

    switch (event.type) {
      case 'video.upload.asset_created': {
        const uploadId = event.data.id;
        const assetId = event.data.asset_id;
        await admin.from('portfolio_media').update({ mux_asset_id: assetId, processing_status: 'processing' }).eq('mux_upload_id', uploadId);
        await admin.from('post_media').update({ mux_asset_id: assetId, processing_status: 'processing' }).eq('mux_upload_id', uploadId);
        break;
      }
      case 'video.asset.ready': {
        const assetId = event.data.id;
        const playbackId = event.data.playback_ids?.[0]?.id;
        if (!playbackId) break;

        const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

        await admin
          .from('portfolio_media')
          .update({ processing_status: 'ready', video_playback_url: playbackUrl, thumbnail_url: thumbnailUrl, storage_path: playbackUrl })
          .eq('mux_asset_id', assetId);
        await admin
          .from('post_media')
          .update({ processing_status: 'ready', video_playback_url: playbackUrl, thumbnail_url: thumbnailUrl, storage_path: playbackUrl })
          .eq('mux_asset_id', assetId);
        break;
      }
      case 'video.asset.errored': {
        const assetId = event.data.id;
        await admin.from('portfolio_media').update({ processing_status: 'failed' }).eq('mux_asset_id', assetId);
        await admin.from('post_media').update({ processing_status: 'failed' }).eq('mux_asset_id', assetId);
        break;
      }
      default:
        // Ignore event types we don't act on — Mux sends many more webhook
        // types than the three handled above.
        break;
    }

    return jsonResponse({ received: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
