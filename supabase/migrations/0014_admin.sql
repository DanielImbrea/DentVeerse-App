-- Admin / Audit. See docs/02-database.md §12. (admin_users was created
-- earlier in 0009_verification.sql, since verification_requests references it.)

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_admin_idx on public.audit_logs (admin_id);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
