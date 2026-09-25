-- Post reactions (4 professional types) + message attachment platform limits.

-- ============================================================================
-- Reactions: extend likes with reaction_type (one per user per post)
-- ============================================================================
alter table public.likes
  add column reaction_type text not null default 'appreciate'
  check (reaction_type in ('appreciate', 'love', 'support', 'congrats'));

comment on column public.likes.reaction_type is
  'Post reaction: appreciate (👍), love (❤️), support (🤗), congrats (👏). One per user per target.';

-- Allow users to change their reaction without delete+reinsert.
create policy likes_update_self on public.likes
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- Platform limits: message attachments
-- ============================================================================
insert into public.platform_limits (key, value) values
  ('max_message_attachment_bytes', 8388608),  -- 8 MiB
  ('max_message_attachments_per_message', 1),
  ('messages_page_size', 30)
on conflict (key) do update set value = excluded.value;

-- Enforce attachment size and count at insert time.
create or replace function public.enforce_message_attachment_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_bytes int;
  v_max_per_message int;
  v_current_count int;
begin
  select value into v_max_bytes
  from public.platform_limits where key = 'max_message_attachment_bytes';

  select value into v_max_per_message
  from public.platform_limits where key = 'max_message_attachments_per_message';

  if new.file_size_bytes is not null and v_max_bytes is not null and new.file_size_bytes > v_max_bytes then
    raise exception 'Attachment exceeds maximum size of % bytes', v_max_bytes;
  end if;

  select count(*) into v_current_count
  from public.message_attachments
  where message_id = new.message_id;

  if v_max_per_message is not null and v_current_count >= v_max_per_message then
    raise exception 'Message already has the maximum of % attachment(s)', v_max_per_message;
  end if;

  return new;
end;
$$;

create trigger message_attachments_enforce_limits
  before insert on public.message_attachments
  for each row execute function public.enforce_message_attachment_limits();

-- RPC: reaction breakdown for a post (members see counts only, no PII).
create or replace function public.get_post_reaction_breakdown(p_post_id uuid)
returns table (reaction_type text, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select l.reaction_type, count(*)::bigint
  from public.likes l
  where l.target_type = 'post'
    and l.target_id = p_post_id
  group by l.reaction_type
  order by count(*) desc;
$$;

revoke all on function public.get_post_reaction_breakdown(uuid) from public;
grant execute on function public.get_post_reaction_breakdown(uuid) to authenticated;
