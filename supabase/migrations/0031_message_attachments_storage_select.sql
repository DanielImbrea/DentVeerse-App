-- Allow conversation members to read message attachment objects in Storage
-- so the mobile client can mint signed URLs without the Edge Function
-- (required for local dev on physical devices).

create policy "message attachments read for conversation members" on storage.objects
  for select using (
    bucket_id = 'message-attachments'
    and exists (
      select 1
      from public.message_attachments ma
      join public.messages m on m.id = ma.message_id
      where ma.storage_path = name
        and public.is_conversation_member(m.conversation_id)
    )
  );
