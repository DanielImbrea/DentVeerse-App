-- Storage buckets. See docs/02-database.md (media sections) and
-- docs/03-security.md §4 (verification documents must be private/admin-only).

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('logos-covers', 'logos-covers', true),
  ('portfolio', 'portfolio', true),
  ('post-media', 'post-media', true),
  ('dentist-photos', 'dentist-photos', true),
  ('service-images', 'service-images', true),
  ('message-attachments', 'message-attachments', false),
  ('verification-documents', 'verification-documents', false),
  ('data-exports', 'data-exports', false)
on conflict (id) do nothing;

-- ============================================================================
-- USER-OWNED buckets: path convention {auth.uid()}/{filename}.
-- Only `avatars` follows this model (a patient's own profile photo).
-- ============================================================================
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars write own folder" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update own folder" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own folder" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- ORG-OWNED buckets: path convention {clinic_id_or_laboratory_id}/{filename}.
-- CORRECTED during audit — these buckets hold assets belonging to an
-- organization (clinic/laboratory), uploaded by any of that org's team
-- members via clinic_members/laboratory_members, not by a single user's own
-- identity. A naive auth.uid()-folder-match policy (as used for `avatars`)
-- would incorrectly reject every upload here, since the mobile screens
-- (apps/mobile/app/clinic-admin/[id]/portfolio.tsx,
-- apps/mobile/app/clinic-admin/[id]/profile-edit.tsx, and their laboratory
-- equivalents) upload to `{clinic_id}/...` / `{laboratory_id}/...`, not
-- `{auth.uid()}/...`. This policy instead checks that the first path
-- segment (the org id) is an org the caller manages, via the same
-- is_clinic_manager/is_laboratory_manager helper functions RLS uses
-- elsewhere (supabase/migrations/0016_rls_helper_functions.sql) — a
-- consistent, single definition of "who can act on behalf of this org"
-- reused across both table RLS and storage RLS.
-- ============================================================================
create or replace function public.is_org_folder_writable(folder_id text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    public.is_clinic_manager(folder_id::uuid)
    or public.is_laboratory_manager(folder_id::uuid);
$$;

create policy "org bucket public read" on storage.objects
  for select using (
    bucket_id in ('logos-covers', 'portfolio', 'post-media', 'dentist-photos', 'service-images')
  );

create policy "org bucket write own org folder" on storage.objects
  for insert with check (
    bucket_id in ('logos-covers', 'portfolio', 'post-media', 'dentist-photos', 'service-images')
    and public.is_org_folder_writable((storage.foldername(name))[1])
  );

create policy "org bucket update own org folder" on storage.objects
  for update using (
    bucket_id in ('logos-covers', 'portfolio', 'post-media', 'dentist-photos', 'service-images')
    and public.is_org_folder_writable((storage.foldername(name))[1])
  );

create policy "org bucket delete own org folder" on storage.objects
  for delete using (
    bucket_id in ('logos-covers', 'portfolio', 'post-media', 'dentist-photos', 'service-images')
    and public.is_org_folder_writable((storage.foldername(name))[1])
  );

-- message-attachments: no direct client SELECT policy at all — access is
-- exclusively via short-lived signed URLs minted server-side/RPC after
-- confirming conversation membership (docs/06-feed-messaging.md Part B).
-- Client MAY insert directly into their own folder (upload), matching the
-- message_attachments table INSERT RLS policy in 0019. This one genuinely
-- IS user-owned (a message sender uploads under their own id, per
-- apps/mobile/app/conversation/[id].tsx's `${userId}/${conversationId}/...`
-- path), so the auth.uid()-folder-match model is correct here.
create policy "message attachments write own folder" on storage.objects
  for insert with check (
    bucket_id = 'message-attachments' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- verification-documents: NO client SELECT policy at all (admin-only via
-- signed URL minted by an admin Edge Function using the service-role key,
-- which bypasses Storage RLS entirely). Client MAY insert (upload) — this
-- one is also genuinely user-owned per
-- apps/mobile/app/verification/submit.tsx's `${userId}/${requestId}/...`
-- path (matching packages/api/src/verification.ts `uploadVerificationDocument`).
create policy "verification documents write own folder" on storage.objects
  for insert with check (
    bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- data-exports: no client SELECT policy — delivered via signed URL from the
-- export-fulfillment Edge Function only.
