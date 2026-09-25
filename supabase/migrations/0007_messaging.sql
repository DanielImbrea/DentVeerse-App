-- Messaging. See docs/02-database.md §6 and docs/06-feed-messaging.md Part B.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null default 'direct',
  origin conversation_origin not null default 'manual',
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  acting_as_type acting_as_type not null,
  acting_as_id uuid not null, -- self (user_id) if patient, else clinic/laboratory id
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index conversation_members_conversation_idx on public.conversation_members (conversation_id);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id),
  content text,
  status message_status not null default 'sent',
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_user_id);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  type attachment_type not null,
  storage_path text not null, -- private bucket, signed-URL access only
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index message_attachments_message_idx on public.message_attachments (message_id);

-- Wire the deferred FK from opportunity_interests.conversation_id now that
-- conversations exists.
alter table public.opportunity_interests
  add constraint opportunity_interests_conversation_fk
  foreign key (conversation_id) references public.conversations(id);

-- Keep conversations.last_message_at denormalized for conversation-list sort.
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- ============================================================================
-- blocked_users (needed here so create_or_get_conversation logic below and
-- RLS in 0017 can reference it; declared early since messaging depends on it)
-- ============================================================================
create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create index blocked_users_blocker_idx on public.blocked_users (blocker_user_id);
create index blocked_users_blocked_idx on public.blocked_users (blocked_user_id);

-- ============================================================================
-- create_or_get_conversation: the single server-side entrypoint for starting
-- a conversation, enforcing the allowed-pair rules and blocking checks from
-- docs/06-feed-messaging.md Part B. Called via RPC (supabase.rpc(...)), never
-- via a raw client INSERT into conversations/conversation_members.
-- ============================================================================
create or replace function public.create_or_get_conversation(
  p_other_user_id uuid,
  p_my_acting_as_type acting_as_type,
  p_my_acting_as_id uuid,
  p_other_acting_as_type acting_as_type,
  p_other_acting_as_id uuid,
  p_origin conversation_origin default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_existing_conversation_id uuid;
  v_new_conversation_id uuid;
  v_allowed boolean := false;
begin
  if v_me is null then
    raise exception 'create_or_get_conversation: not authenticated';
  end if;

  -- Block check, both directions.
  if exists (
    select 1 from public.blocked_users
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'create_or_get_conversation: blocked';
  end if;

  -- Allowed-pair rules (client spec §17): Patient->Clinic, Clinic->Laboratory,
  -- Laboratory->Clinic, Clinic->Clinic, Laboratory->Laboratory.
  -- Patient->Patient and Patient->Laboratory are NOT allowed.
  if p_my_acting_as_type = 'patient' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'patient' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'laboratory' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'laboratory' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'laboratory' and p_other_acting_as_type = 'laboratory' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'create_or_get_conversation: this pair of account types cannot message each other';
  end if;

  -- Reuse an existing direct conversation between these two identities if one exists.
  select cm1.conversation_id into v_existing_conversation_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = v_me
    and cm2.user_id = p_other_user_id
  limit 1;

  if v_existing_conversation_id is not null then
    return v_existing_conversation_id;
  end if;

  insert into public.conversations (type, origin)
  values ('direct', p_origin)
  returning id into v_new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, acting_as_type, acting_as_id)
  values
    (v_new_conversation_id, v_me, p_my_acting_as_type, p_my_acting_as_id),
    (v_new_conversation_id, p_other_user_id, p_other_acting_as_type, p_other_acting_as_id);

  return v_new_conversation_id;
end;
$$;
