// gdpr-data-export
//
// Assembles the requesting user's data bundle and writes it to the private
// data-exports bucket, per docs/11-gdpr-i18n.md Part A. Intended to be
// triggered by a Database Webhook on INSERT into data_export_requests (set
// up in the Supabase dashboard / via a migration using
// `supabase_functions.http_request` trigger), or invoked directly for
// testing.
//
// STATUS: written, NOT executed. Requires a running Supabase project +
// Database Webhook configuration (dashboard-only step, not expressible in a
// SQL migration) to wire the trigger — set this up locally in Cursor.
//
// AUDIT FIX (this session): posts are now correctly filtered to those
// authored by orgs the requesting user actually manages (resolved from
// their clinic_members/laboratory_members rows), rather than the earlier
// version which fetched all posts and omitted them from the bundle
// entirely as a safety measure.

import { createServiceRoleClient, jsonResponse, errorResponse } from '../_shared/client.ts';

const EXPORT_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches docs/11-gdpr-i18n.md

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const { record } = await req.json(); // Database Webhook payload shape: { record: {...new row} }
    const requestId: string | undefined = record?.id;
    const userId: string | undefined = record?.user_id;
    if (!requestId || !userId) return errorResponse('Invalid webhook payload — missing record.id/user_id');

    const admin = createServiceRoleClient();

    await admin.from('data_export_requests').update({ status: 'processing' }).eq('id', requestId);

    // Assemble the bundle. Per docs/11-gdpr-i18n.md: the user's own data
    // only — their own sent messages (not the counterpart's), not other
    // users' content.
    const [
      userRow,
      patientProfile,
      clinicMemberships,
      laboratoryMemberships,
      comments,
      reviews,
      favorites,
      follows,
      sentMessages,
      notifications,
    ] = await Promise.all([
      admin.from('users').select('*').eq('id', userId).single(),
      admin.from('patient_profiles').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('clinic_members').select('clinic_id, role, clinics(name, slug)').eq('user_id', userId),
      admin.from('laboratory_members').select('laboratory_id, role, laboratories(name, slug)').eq('user_id', userId),
      admin.from('comments').select('*').eq('author_user_id', userId),
      admin.from('reviews').select('*').eq('patient_user_id', userId),
      admin.from('favorites').select('*').eq('user_id', userId),
      admin.from('follows').select('*').eq('follower_user_id', userId),
      admin.from('messages').select('*').eq('sender_user_id', userId),
      admin.from('notifications').select('*').eq('user_id', userId),
    ]);

    // FIXED during audit (was previously fetching all posts unfiltered and
    // omitting them from the bundle entirely as a safety measure). Now
    // correctly scoped to posts authored by orgs this user actually
    // manages, resolved from the membership queries above.
    const managedClinicIds = (clinicMemberships.data ?? []).map((m) => m.clinic_id);
    const managedLabIds = (laboratoryMemberships.data ?? []).map((m) => m.laboratory_id);

    const postsFilters: string[] = [];
    if (managedClinicIds.length > 0) {
      postsFilters.push(`and(author_type.eq.clinic,author_id.in.(${managedClinicIds.join(',')}))`);
    }
    if (managedLabIds.length > 0) {
      postsFilters.push(`and(author_type.eq.laboratory,author_id.in.(${managedLabIds.join(',')}))`);
    }

    const posts =
      postsFilters.length > 0
        ? await admin.from('posts').select('*').or(postsFilters.join(','))
        : { data: [] as unknown[] };

    const bundle = {
      exported_at: new Date().toISOString(),
      user: userRow.data,
      patient_profile: patientProfile.data,
      clinic_memberships: clinicMemberships.data,
      laboratory_memberships: laboratoryMemberships.data,
      authored_posts: posts.data,
      comments: comments.data,
      reviews: reviews.data,
      favorites: favorites.data,
      follows: follows.data,
      sent_messages: sentMessages.data,
      notifications: notifications.data,
    };

    const path = `${userId}/export-${requestId}.json`;
    const { error: uploadError } = await admin.storage
      .from('data-exports')
      .upload(path, new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), {
        upsert: true,
      });

    if (uploadError) {
      await admin.from('data_export_requests').update({ status: 'pending' }).eq('id', requestId);
      return errorResponse(uploadError.message, 500);
    }

    const expiresAt = new Date(Date.now() + EXPORT_URL_TTL_SECONDS * 1000).toISOString();

    await admin
      .from('data_export_requests')
      .update({ status: 'ready', file_storage_path: path, completed_at: new Date().toISOString(), expires_at: expiresAt })
      .eq('id', requestId);

    return jsonResponse({ status: 'ready', path });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
