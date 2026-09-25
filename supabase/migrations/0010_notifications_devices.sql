-- Notifications & Devices. See docs/02-database.md §9, docs/08-verification-notifications-reports.md Part B.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notification_type not null,
  actor_type text,
  actor_id uuid,
  target_type text,
  target_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_read_idx on public.notifications (user_id, read_at);

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  new_follower boolean not null default true,
  new_like boolean not null default true,
  new_comment boolean not null default true,
  new_message boolean not null default true,
  collaboration_request boolean not null default true,
  opportunity_response boolean not null default true,
  verification_approved boolean not null default true,
  new_review boolean not null default true
);

-- Bootstraps default notification preferences whenever a public.users row is created.
create or replace function public.bootstrap_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger users_bootstrap_notification_preferences
  after insert on public.users
  for each row execute function public.bootstrap_notification_preferences();

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  push_token text unique not null,
  platform device_platform not null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index devices_user_idx on public.devices (user_id);

-- Lightweight outbox table polled by the push-dispatch Edge Function
-- (docs/08-verification-notifications-reports.md Part B step 2) rather than
-- sending push synchronously inside the triggering transaction.
create table public.push_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index push_queue_unprocessed_idx on public.push_queue (processed) where not processed;
