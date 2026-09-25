import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '@mobile/lib/supabase';

type PostMediaRow = {
  media_type: string;
  storage_path: string;
  video_playback_url: string | null;
  thumbnail_url?: string | null;
  processing_status?: string | null;
};

export function resolvePostMediaUrl(
  media: PostMediaRow,
  client: SupabaseClient = defaultClient
): string | null {
  if (media.media_type === 'video') {
    if (media.video_playback_url) return media.video_playback_url;
    if (media.thumbnail_url) return media.thumbnail_url;
    if (media.processing_status === 'pending' || media.processing_status === 'processing') return null;
  }
  if (media.storage_path.startsWith('http')) return media.storage_path;
  return client.storage.from('post-media').getPublicUrl(media.storage_path).data.publicUrl;
}
