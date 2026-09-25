import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

type PortfolioItemInsert = Database['public']['Tables']['portfolio_items']['Insert'];
type PortfolioMediaInsert = Database['public']['Tables']['portfolio_media']['Insert'];

/**
 * Portfolio CRUD. See client spec §6, §9; docs/02-database.md §2;
 * docs/16-client-decisions-mvp-scope-update.md §5 (max 25 media/item,
 * enforced server-side by a trigger — the INSERT below will throw a
 * Postgres error if the limit is exceeded, surface that to the user as
 * "portfolio item is full", not a generic error).
 */
export async function createPortfolioItem(supabase: SupabaseClient<Database>, input: PortfolioItemInsert) {
  return supabase.from('portfolio_items').insert(input).select().single();
}

export async function updatePortfolioItem(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<PortfolioItemInsert>
) {
  return supabase.from('portfolio_items').update(patch).eq('id', id).select().single();
}

export async function removePortfolioItem(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('portfolio_items').update({ deleted_at: new Date().toISOString(), status: 'removed' }).eq('id', id);
}

export async function listOwnerPortfolio(
  supabase: SupabaseClient<Database>,
  ownerType: 'clinic' | 'laboratory',
  ownerId: string,
  categoryId?: string
) {
  let query = supabase
    .from('portfolio_items')
    .select('*, portfolio_media(*), portfolio_categories(label_ro, label_en)')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (categoryId) query = query.eq('category_id', categoryId);
  return query;
}

export async function listPortfolioCategories(supabase: SupabaseClient<Database>) {
  return supabase.from('portfolio_categories').select('*');
}

/**
 * Records a media file after it has been uploaded to Storage. The actual
 * file upload (expo-image-picker -> Supabase Storage resumable upload) and
 * video transcoding hand-off (Mux/Cloudflare Stream) are NOT implemented
 * here — they require a device camera/gallery and a live network call to an
 * external transcoding provider, neither of which can be exercised in this
 * environment. This function is the correct next step once a
 * `storage_path` exists from that upload flow. See
 * docs/06-feed-messaging.md "Media loading & video handling" and
 * supabase/functions/README.md for the video-transcoding Edge Function
 * still to be written.
 */
export async function addPortfolioMedia(supabase: SupabaseClient<Database>, input: PortfolioMediaInsert) {
  return supabase.from('portfolio_media').insert(input).select().single();
}

export async function removePortfolioMedia(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('portfolio_media').delete().eq('id', id);
}

/**
 * Video upload — see supabase/functions/create-mux-upload/index.ts for the
 * full architecture. Returns a Mux direct-upload URL; the caller must then
 * PUT the raw video file bytes to that URL directly (not through Supabase).
 */
export async function createVideoUpload(
  supabase: SupabaseClient<Database>,
  portfolioItemId: string,
  displayOrder = 0
) {
  const { data, error } = await supabase.functions.invoke('create-mux-upload', {
    body: { portfolio_item_id: portfolioItemId, display_order: displayOrder },
  });
  if (error) throw error;
  return data as { upload_url: string; portfolio_media_id: string };
}

/** Uploads raw video bytes directly to Mux's returned upload URL (not via Supabase). */
export async function uploadVideoToMux(uploadUrl: string, videoBlob: Blob) {
  const response = await fetch(uploadUrl, { method: 'PUT', body: videoBlob });
  if (!response.ok) throw new Error(`Video upload failed: ${response.status}`);
}

export async function reorderPortfolioMedia(
  supabase: SupabaseClient<Database>,
  updates: { id: string; display_order: number }[]
) {
  // Batched as individual updates — Supabase JS has no native bulk-upsert-
  // by-id-list helper that preserves partial-row updates cleanly; for a
  // gallery of at most 25 items (platform_limits) this is an acceptable
  // number of round trips. Revisit with a single RPC if reordering
  // performance becomes an issue at scale.
  return Promise.all(
    updates.map(({ id, display_order }) =>
      supabase.from('portfolio_media').update({ display_order }).eq('id', id)
    )
  );
}
