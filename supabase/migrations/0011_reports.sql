-- Reporting. See docs/02-database.md §10, docs/08-verification-notifications-reports.md Part C.
-- (blocked_users was created earlier in 0007_messaging.sql, since the
-- create_or_get_conversation function depends on it.)

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id),
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  note text,
  content_snapshot text, -- for message-type reports: snapshot content at report time
                          -- so later deletion/editing doesn't erase moderation evidence
                          -- (docs/06-feed-messaging.md Part B "Block / Report inside messaging")
  status report_status not null default 'open',
  resolved_by_admin_id uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_target_idx on public.reports (target_type, target_id);
create index reports_status_idx on public.reports (status);
