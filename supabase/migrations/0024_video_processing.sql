-- Video processing support for portfolio_media. See docs/06-feed-messaging.md
-- "Media loading & video handling" and the Mux integration added this
-- session (supabase/functions/create-mux-upload, supabase/functions/mux-webhook).

create type media_processing_status as enum ('pending', 'processing', 'ready', 'failed');

alter table public.portfolio_media
  add column processing_status media_processing_status not null default 'ready';
  -- Images are 'ready' immediately (no transcoding step); videos are
  -- inserted as 'pending' by create-mux-upload and transition to
  -- 'processing' -> 'ready'/'failed' via the mux-webhook Edge Function.

alter table public.portfolio_media
  add column mux_asset_id text;
  -- Mux's identifier for the asset, used to correlate incoming webhooks
  -- back to the correct row. Null for images.

alter table public.portfolio_media
  add column mux_upload_id text;
  -- Mux's identifier for the direct-upload session, used if a client needs
  -- to poll upload status before the asset itself exists. Null for images.

create index portfolio_media_mux_asset_idx on public.portfolio_media (mux_asset_id) where mux_asset_id is not null;

-- Same processing-status tracking for post_media (feed video posts, added
-- this session's post composer — apps/mobile/app/modals/create-post.tsx
-- currently uploads video directly without Mux transcoding as a pragmatic
-- MVP shortcut; this column exists so post_media can adopt the same Mux
-- pipeline as portfolio_media later without another migration).
alter table public.post_media
  add column processing_status media_processing_status not null default 'ready';
alter table public.post_media
  add column mux_asset_id text;
alter table public.post_media
  add column mux_upload_id text;
