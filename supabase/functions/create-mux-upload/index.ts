// create-mux-upload
//
// Video upload architecture per docs/06-feed-messaging.md "Media loading &
// video handling" and docs/17-implementation-status.md's portfolio-video
// gap (now closed architecturally). Flow:
//   1. Client calls this function with { portfolio_item_id, display_order }.
//   2. This function verifies the caller manages the org that owns the
//      portfolio item (via the same is_clinic_manager/is_laboratory_manager
//      pattern used everywhere else), inserts a `portfolio_media` row with
//      processing_status='pending' and media_type='video', and asks Mux's
//      API for a direct-upload URL (server-side, using the Mux token —
//      NEVER exposed to the client).
//   3. Client uploads the actual video file bytes DIRECTLY to the returned
//      Mux upload URL (not through Supabase at all — this is the standard
//      Mux direct-upload pattern, avoiding routing large video files
//      through your own server/functions).
//   4. Mux transcodes the video and calls the `mux-webhook` function when
//      ready, which updates the portfolio_media row with the final
//      playback URL and thumbnail.
//
// STATUS: written, NOT executed. Requires a real Mux account (MUX_TOKEN_ID /
// MUX_TOKEN_SECRET, see .env.example) and has never made a real API call to
// Mux from this environment.

import { createServiceRoleClient, getCallerUserId, jsonResponse, errorResponse } from '../_shared/client.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const MUX_API_BASE = 'https://api.mux.com';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const callerId = await getCallerUserId(req);

    // RATE LIMITED (closes gap documented in 0027_rate_limiting.sql): each
    // video upload calls Mux's API (real cost/quota implications), so this
    // is capped tighter than typical request-rate limits.
    const allowed = await checkRateLimit(callerId, 'create-mux-upload', 10, 3600);
    if (!allowed) {
      return errorResponse('Too many video upload requests. Please wait before uploading more videos.', 429);
    }

    const { portfolio_item_id, post_id, display_order } = await req.json();
    if (!portfolio_item_id && !post_id) return errorResponse('portfolio_item_id or post_id is required');
    if (portfolio_item_id && post_id) return errorResponse('Provide only one of portfolio_item_id or post_id');

    const admin = createServiceRoleClient();

    if (post_id) {
      const { data: post, error: postError } = await admin
        .from('posts')
        .select('id, author_type, author_id')
        .eq('id', post_id)
        .single();

      if (postError || !post) return errorResponse('Post not found', 404);

      const memberTable = post.author_type === 'clinic' ? 'clinic_members' : 'laboratory_members';
      const orgIdColumn = post.author_type === 'clinic' ? 'clinic_id' : 'laboratory_id';
      const { data: membership } = await admin
        .from(memberTable)
        .select('id')
        .eq(orgIdColumn, post.author_id)
        .eq('user_id', callerId)
        .maybeSingle();

      if (!membership) return errorResponse('Not authorized to add media to this post', 403);

      const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
      const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
      if (!muxTokenId || !muxTokenSecret) {
        return errorResponse('Video upload is not configured on the server (missing Mux credentials)', 500);
      }

      const muxResponse = await fetch(`${MUX_API_BASE}/video/v1/uploads`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cors_origin: '*',
          new_asset_settings: { playback_policy: ['public'] },
        }),
      });

      if (!muxResponse.ok) {
        return errorResponse(`Mux API error: ${muxResponse.status}`, 502);
      }

      const muxData = await muxResponse.json();
      const uploadUrl: string = muxData.data.url;
      const uploadId: string = muxData.data.id;

      const { data: mediaRow, error: insertError } = await admin
        .from('post_media')
        .insert({
          post_id,
          media_type: 'video',
          storage_path: `mux-upload:${uploadId}`,
          processing_status: 'pending',
          mux_upload_id: uploadId,
          display_order: display_order ?? 0,
        })
        .select()
        .single();

      if (insertError || !mediaRow) return errorResponse(insertError?.message ?? 'Failed to create media record', 500);

      return jsonResponse({ upload_url: uploadUrl, post_media_id: mediaRow.id });
    }

    // Portfolio item upload (original path)
    // mirrors the RLS policy logic in supabase/migrations/0018 exactly,
    // re-implemented here because this function runs with the service-role
    // key (bypassing RLS by design, since it needs to insert on the
    // caller's behalf before Mux has responded) and must therefore
    // re-check authorization manually rather than relying on RLS to do it.
    const { data: item, error: itemError } = await admin
      .from('portfolio_items')
      .select('id, owner_type, owner_id')
      .eq('id', portfolio_item_id)
      .single();

    if (itemError || !item) return errorResponse('Portfolio item not found', 404);

    const memberTable = item.owner_type === 'clinic' ? 'clinic_members' : 'laboratory_members';
    const orgIdColumn = item.owner_type === 'clinic' ? 'clinic_id' : 'laboratory_id';
    const { data: membership } = await admin
      .from(memberTable)
      .select('id')
      .eq(orgIdColumn, item.owner_id)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership) return errorResponse('Not authorized to add media to this portfolio item', 403);

    // Enforce the same 25-media-per-item limit the DB trigger enforces for
    // images (supabase/migrations/0012_platform_limits.sql) — checked here
    // too since the trigger fires on the eventual INSERT below, but
    // checking first gives a clearer error before we've called Mux's API.
    const { count } = await admin
      .from('portfolio_media')
      .select('id', { count: 'exact', head: true })
      .eq('portfolio_item_id', portfolio_item_id);

    const { data: limitRow } = await admin.from('platform_limits').select('value').eq('key', 'max_portfolio_media_per_item').single();
    if ((count ?? 0) >= (limitRow?.value ?? 25)) {
      return errorResponse(`This portfolio item already has the maximum of ${limitRow?.value ?? 25} media files`, 400);
    }

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
    if (!muxTokenId || !muxTokenSecret) {
      return errorResponse('Video upload is not configured on the server (missing Mux credentials)', 500);
    }

    const muxResponse = await fetch(`${MUX_API_BASE}/video/v1/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: { playback_policy: ['public'] },
      }),
    });

    if (!muxResponse.ok) {
      return errorResponse(`Mux API error: ${muxResponse.status}`, 502);
    }

    const muxData = await muxResponse.json();
    const uploadUrl: string = muxData.data.url;
    const uploadId: string = muxData.data.id;

    const { data: mediaRow, error: insertError } = await admin
      .from('portfolio_media')
      .insert({
        portfolio_item_id,
        media_type: 'video',
        storage_path: `mux-upload:${uploadId}`, // placeholder until the asset exists; updated by mux-webhook
        processing_status: 'pending',
        mux_upload_id: uploadId,
        display_order: display_order ?? 0,
      })
      .select()
      .single();

    if (insertError || !mediaRow) return errorResponse(insertError?.message ?? 'Failed to create media record', 500);

    return jsonResponse({ upload_url: uploadUrl, portfolio_media_id: mediaRow.id });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
