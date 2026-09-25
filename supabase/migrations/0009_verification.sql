-- Verification. See docs/02-database.md §8, docs/08-verification-notifications-reports.md
-- Part A, and docs/16-client-decisions-mvp-scope-update.md §6 (confirmed document set).

-- admin_users declared here (needed as an FK target) — full admin schema in 0014_admin.sql.
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role admin_role not null default 'support',
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  subject_type verification_subject_type not null,
  subject_id uuid not null,
  status verification_status not null default 'pending',
  reviewed_by_admin_id uuid references public.admin_users(id),
  review_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index verification_requests_subject_idx on public.verification_requests (subject_type, subject_id);
create index verification_requests_status_idx on public.verification_requests (status);

create or replace function public.validate_verification_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_type = 'clinic' and not exists (select 1 from public.clinics where id = new.subject_id) then
    raise exception 'verification_requests.subject_id % does not reference an existing clinic', new.subject_id;
  elsif new.subject_type = 'laboratory' and not exists (select 1 from public.laboratories where id = new.subject_id) then
    raise exception 'verification_requests.subject_id % does not reference an existing laboratory', new.subject_id;
  end if;
  return new;
end;
$$;

create trigger verification_requests_validate_subject
  before insert or update of subject_type, subject_id on public.verification_requests
  for each row execute function public.validate_verification_subject();

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references public.verification_requests(id) on delete cascade,
  storage_path text not null, -- private bucket, admin-only, see docs/03-security.md §4
  document_type verification_document_type not null,
  uploaded_at timestamptz not null default now()
);

create index verification_documents_request_idx on public.verification_documents (verification_request_id);

-- Approving a verification request flips the badge on the subject org and
-- stamps reviewed_at — the notification itself is fired by a separate
-- trigger in 0016_helper_functions_and_triggers.sql (notification pipeline)
-- to keep this migration focused on the badge-flip responsibility only.
create or replace function public.handle_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status then
    new.reviewed_at = now();
    if new.status = 'approved' then
      if new.subject_type = 'clinic' then
        update public.clinics set is_verified = true where id = new.subject_id;
      elsif new.subject_type = 'laboratory' then
        update public.laboratories set is_verified = true where id = new.subject_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger verification_requests_handle_decision
  before update of status on public.verification_requests
  for each row execute function public.handle_verification_decision();
