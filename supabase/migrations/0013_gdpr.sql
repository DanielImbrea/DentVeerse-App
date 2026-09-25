-- GDPR / Compliance. See docs/02-database.md §13, docs/11-gdpr-i18n.md Part A.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now()
);

create index consent_records_user_idx on public.consent_records (user_id);

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status export_request_status not null default 'pending',
  file_storage_path text, -- private, expiring
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

create index data_export_requests_user_idx on public.data_export_requests (user_id);

-- Account deletion request tracking — drives the 30-day grace-window hard
-- deletion described in docs/16-client-decisions-mvp-scope-update.md §7.
-- Exact grace window is confirmed here as 30 days per that document's
-- recommendation; adjust the default if the client specifies otherwise.
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  scheduled_hard_delete_at timestamptz not null default (now() + interval '30 days'),
  completed boolean not null default false,
  completed_at timestamptz
);

create index account_deletion_requests_pending_idx
  on public.account_deletion_requests (scheduled_hard_delete_at) where not completed;
